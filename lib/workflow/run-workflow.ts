import type { LlmClient } from "../gemini/types";
import type { DocumentMeta, RuleEngineConfig } from "../rule-engine/types";
import type { Finding, CanonicalFact, ExtractedFact, RequirementManifest, ChecklistItem, ClarificationQuestion } from "../schemas";
import { buildCanonicalFacts } from "../rule-engine/canonical-facts";
import { runDeterministicRuleEngine, resetFindingIdCounter } from "../rule-engine/engine";
import { rejectUnsupportedFindings } from "../rule-engine/reject-unsupported";
import { runNode1RequirementCompiler } from "./node1";
import { runNode2DocumentRouter } from "./node2";
import { runNode3EvidenceExtractor } from "./node3";
import { runNode6AdversarialAuditor } from "./node6";
import { runNode7Verifier } from "./node7";
import { runNode8Clarification } from "./node8";
import { runNode9CorrectionPlanner } from "./node9";

export interface WorkflowInput {
  auditId: string;
  officialDocumentsText: string;
  /** documentId -> raw extracted text, one entry per uploaded applicant document. */
  documentTexts: Record<string, string>;
  documents: DocumentMeta[];
  ruleEngineConfig: RuleEngineConfig;
}

export interface NodeTiming {
  node: string;
  latencyMs: number;
  isMock: boolean;
}

export interface WorkflowResult {
  manifest: RequirementManifest;
  canonicalFacts: CanonicalFact[];
  extractedFacts: ExtractedFact[];
  findings: Finding[]; // final, verified/rejected/human_review — never raw candidates
  checklist: ChecklistItem[];
  clarificationQuestions: ClarificationQuestion[];
  timings: NodeTiming[];
  /** True if ANY node in this run used the mock client — the UI must show this prominently. */
  isMock: boolean;
}

/**
 * Runs all 9 nodes in order. Nodes 1-3 and 6-9 call the given LlmClient (real Gemini, or the
 * deterministic mock). Nodes 4-5 never touch an LLM.
 *
 * Nodes 6-9 need real semantic judgment (probing for missed defects, weighing OCR plausibility,
 * phrasing a question, writing a plain-language explanation) that a canned mock response cannot
 * honestly stand in for on arbitrary runtime findings. When the client is the mock client, this
 * orchestrator uses clearly-labeled, simplified deterministic policies for nodes 6-9 instead of
 * pretending to mock them — see runNode6Through9Mock below and docs/evaluation.md. With a real
 * GeminiClient, the full LLM-backed nodes 6-9 run for real.
 */
export async function runClearPacketWorkflow(input: WorkflowInput, client: LlmClient): Promise<WorkflowResult> {
  resetFindingIdCounter();
  const timings: NodeTiming[] = [];
  let anyMock = false;

  // Node 1
  const node1 = await runNode1RequirementCompiler(client, input.officialDocumentsText, `node1:${input.auditId}`);
  timings.push({ node: "node1_requirement_compiler", latencyMs: node1.latencyMs, isMock: node1.isMock });
  anyMock = anyMock || node1.isMock;

  // Node 2 + Node 3, per document
  const extractedFacts: ExtractedFact[] = [];
  for (const doc of input.documents) {
    const text = input.documentTexts[doc.documentId] ?? "";
    const node2 = await runNode2DocumentRouter(client, doc.documentId, text, `node2:${doc.documentId}`);
    timings.push({ node: `node2_document_router:${doc.documentId}`, latencyMs: node2.latencyMs, isMock: node2.isMock });
    anyMock = anyMock || node2.isMock;

    const node3 = await runNode3EvidenceExtractor(client, doc.documentId, node2.classification.documentType, text, `node3:${doc.documentId}`);
    timings.push({ node: `node3_evidence_extractor:${doc.documentId}`, latencyMs: node3.latencyMs, isMock: node3.isMock });
    anyMock = anyMock || node3.isMock;
    extractedFacts.push(...node3.facts);
  }

  // Node 4 — deterministic
  const canonicalFacts = buildCanonicalFacts(extractedFacts);

  // Node 5 — deterministic
  const deterministicFindings = runDeterministicRuleEngine({
    manifest: node1.manifest,
    canonicalFacts,
    extractedFacts,
    documents: input.documents,
    config: input.ruleEngineConfig,
  });

  let candidates: Finding[];
  let finalFindings: Finding[];
  let checklist: ChecklistItem[];
  const clarificationQuestions: ClarificationQuestion[] = [];

  if (node1.isMock) {
    // --- Mock-mode path (nodes 6-9): documented simplified policy, not an LLM call. ---
    const mock = runNodes6Through9Mock(deterministicFindings);
    candidates = deterministicFindings;
    finalFindings = mock.findings;
    checklist = mock.checklist;
    clarificationQuestions.push(...mock.clarificationQuestions);
  } else {
    // --- Real-mode path: full LLM nodes 6-9. ---
    const node6 = await runNode6AdversarialAuditor(client, node1.manifest, canonicalFacts, deterministicFindings, `node6:${input.auditId}`);
    timings.push({ node: "node6_adversarial_auditor", latencyMs: node6.latencyMs, isMock: node6.isMock });
    candidates = [...deterministicFindings, ...node6.candidates];

    finalFindings = [];
    for (const candidate of candidates) {
      const node7 = await runNode7Verifier(client, candidate, node1.manifest, canonicalFacts, `node7:${candidate.id}`);
      timings.push({ node: `node7_verifier:${candidate.id}`, latencyMs: node7.latencyMs, isMock: node7.isMock });
      if (node7.verdict.decision === "rejected") {
        finalFindings.push({ ...candidate, status: "rejected" });
        continue;
      }
      if (node7.verdict.decision === "escalate_to_student") {
        const verified: Finding = { ...candidate, status: "human_review" };
        finalFindings.push(verified);
        const relatedFacts = extractedFacts.filter((f) => candidate.evidenceFactIds.includes(f.id));
        const node8 = await runNode8Clarification(client, verified, relatedFacts, `node8:${candidate.id}`);
        timings.push({ node: `node8_clarification:${candidate.id}`, latencyMs: node8.latencyMs, isMock: node8.isMock });
        clarificationQuestions.push({
          id: `cq-${candidate.id}`,
          question: node8.question,
          relatedFactIds: node8.relatedFactIds,
          answer: null,
          answeredAt: null,
        });
        continue;
      }
      finalFindings.push({ ...candidate, status: "verified" });
    }

    const verifiedOnly = finalFindings.filter((f) => f.status === "verified");
    const node9 = await runNode9CorrectionPlanner(client, verifiedOnly, `node9:${input.auditId}`);
    timings.push({ node: "node9_correction_planner", latencyMs: node9.latencyMs, isMock: node9.isMock });
    checklist = node9.checklist;
  }

  return {
    manifest: node1.manifest,
    canonicalFacts,
    extractedFacts,
    findings: rejectUnsupportedFindings(finalFindings),
    checklist,
    clarificationQuestions,
    timings,
    isMock: anyMock,
  };
}

/**
 * Mock-mode substitute for nodes 6-9. Policy (documented, not hidden):
 *  - Node 6 (find more): skipped. With oracle-quality Node 1-3 fixtures there is nothing left
 *    for an adversarial pass to find — this is a property of the fixture data, not evidence
 *    about a real model's adversarial-pass performance. Real benchmark runs must use GeminiClient.
 *  - Node 7 (verify): every deterministic candidate is trusted as verified UNLESS its own
 *    severity is "review", in which case it's escalated to the student. This mirrors what a
 *    verifier SHOULD conclude for oracle-quality input (no OCR uncertainty to weigh), not a
 *    model's judgment.
 *  - Node 8 (ask): a templated question built directly from the finding's own explanation text.
 *  - Node 9 (checklist): a mechanical mapping from finding severity/category to the
 *    ChecklistItem shape — same structure a real Node 9 must produce, filled in without an LLM.
 */
function runNodes6Through9Mock(deterministicFindings: Finding[]): {
  findings: Finding[];
  checklist: ChecklistItem[];
  clarificationQuestions: ClarificationQuestion[];
} {
  const findings: Finding[] = [];
  const checklist: ChecklistItem[] = [];
  const clarificationQuestions: ClarificationQuestion[] = [];

  for (const candidate of deterministicFindings) {
    if (candidate.severity === "review") {
      findings.push({ ...candidate, status: "human_review" });
      clarificationQuestions.push({
        id: `cq-${candidate.id}`,
        question: `${candidate.title} — ${candidate.explanation} Can you confirm or correct this?`,
        relatedFactIds: candidate.evidenceFactIds,
        answer: null,
        answeredAt: null,
      });
      continue;
    }
    findings.push({ ...candidate, status: "verified" });
  }

  const priorityFor = (f: Finding): ChecklistItem["priority"] => {
    if (f.category === "required_document" && f.severity === "critical") return "missing_mandatory_document";
    if (f.category === "cross_document_consistency") return "identity_or_factual_conflict";
    if (f.category === "document_validity") return "expired_documentation";
    if (f.category === "format" || f.category === "signature") return "formatting_or_file_problem";
    if (f.status === "human_review") return "requires_human_review";
    return "possible_disqualifying_problem";
  };

  for (const f of findings.filter((f) => f.status === "verified" || f.status === "human_review")) {
    checklist.push({
      id: `ci-${f.id}`,
      findingId: f.id,
      priority: priorityFor(f),
      whatAppearsWrong: f.title,
      whyItMatters: f.explanation,
      relevantRequirement: f.sourceRequirementEvidence ?? null,
      requirementSource: f.requirementId ?? null,
      applicantEvidence: f.evidenceFactIds.join(", ") || null,
      recommendedNextAction:
        f.status === "human_review" ? "Confirm this manually before submitting." : "Resolve with the issuing office or correct the document before submitting.",
      confidence: f.confidence,
      humanReviewStatus: f.status === "human_review" ? "pending" : "not_required",
    });
  }

  return { findings, checklist, clarificationQuestions };
}
