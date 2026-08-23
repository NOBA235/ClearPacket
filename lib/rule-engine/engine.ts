import type { Requirement, CanonicalFact, ExtractedFact, Finding, RequirementManifest } from "../schemas";
import type { DocumentMeta, RuleEngineConfig } from "./types";
import { parseFlexibleDate, normalizeFinancialYear, compareNames } from "./normalize";

export interface RuleEngineInput {
  manifest: RequirementManifest;
  canonicalFacts: CanonicalFact[];
  extractedFacts: ExtractedFact[];
  documents: DocumentMeta[];
  config: RuleEngineConfig;
}

let idCounter = 0;
function findingId(): string {
  idCounter += 1;
  return `finding-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Resets the module-local id counter — call between test cases / benchmark runs for reproducible ids. */
export function resetFindingIdCounter(): void {
  idCounter = 0;
}

// Identity-bearing fields where a conflict is critical rather than a warning.
const IDENTITY_FIELDS = new Set(["full_name", "date_of_birth", "account_holder_name"]);

export function runDeterministicRuleEngine(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [
    ...checkRequiredDocumentPresence(input),
    ...checkCanonicalFactConflicts(input),
    ...checkFieldRuleRequirements(input),
    ...checkCertificateExpiration(input),
    ...checkFinancialYear(input),
    ...checkDeadline(input),
    ...checkFileFormat(input),
    ...checkPageCount(input),
    ...checkSignaturePresence(input),
    ...checkRequirementEvidenceCoverage(input),
    ...checkAccountHolderConsistency(input),
    ...checkFieldsRequiringConfirmation(input),
    ...checkSuspectedInjection(input),
  ];
  return findings;
}

/**
 * The bank requirement (2.5 in the notice) is "the applicant's OWN name" — that's a
 * cross-FIELD comparison (full_name vs account_holder_name), not a same-field conflict, so it
 * lives outside buildCanonicalFacts (which only groups observations of the same field).
 */
function checkAccountHolderConsistency(input: RuleEngineInput): Finding[] {
  const nameFact = input.canonicalFacts.find((cf) => cf.field === "full_name");
  const holderFact = input.canonicalFacts.find((cf) => cf.field === "account_holder_name");
  if (!nameFact || !holderFact) return [];

  const applicantName = String(nameFact.observations[0]?.value ?? "");
  const holderName = String(holderFact.observations[0]?.value ?? "");
  if (!applicantName || !holderName) return [];

  const cmp = compareNames(applicantName, holderName);
  if (cmp === "identical" || cmp === "harmless") return [];

  const holderDoc = holderFact.observations[0]?.document;
  return [
    {
      id: findingId(),
      requirementId: null,
      severity: "critical",
      category: "cross_document_consistency",
      title: "Bank account holder name does not match applicant name",
      explanation: `The application identifies the applicant as "${applicantName}", but the bank document lists the account holder as "${holderName}". The notice requires the bank document to be in the applicant's own name.`,
      affectedDocuments: holderDoc ? [holderDoc] : [],
      evidenceFactIds: [nameFact.observations[0]!.factId, holderFact.observations[0]!.factId],
      sourceRequirementEvidence: "Bank Passbook or Statement showing the applicant's own name as account holder.",
      confidence: 0.85,
      status: "candidate",
      origin: "deterministic",
    },
  ];
}

function checkRequiredDocumentPresence(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  const presentTypes = new Set(input.documents.map((d) => d.documentType));

  for (const req of input.manifest.requirements) {
    if (req.category !== "required_document" || !req.required) continue;
    if (!req.documentType) continue;

    const present = presentTypes.has(req.documentType as DocumentMeta["documentType"]);
    if (present) continue;

    // Conditional requirements: try to resolve the condition from an explicit
    // "applicant_category"-style fact before falling back to a review escalation. Only ever
    // resolves TOWARD asking for the document (never away from it) on affirmative evidence —
    // absence of evidence is never treated as evidence the condition doesn't apply.
    const conditionConfirmed = req.appliesWhen ? isConditionAffirmativelyConfirmed(req.appliesWhen, input.extractedFacts) : null;
    let severity: "critical" | "review";
    let title: string;
    let explanation: string;

    if (!req.appliesWhen) {
      severity = "critical";
      title = `Missing required document: ${req.documentType}`;
      explanation = `The requirements state this document is mandatory, but no document of this type was found in the packet.`;
    } else if (conditionConfirmed) {
      severity = "critical";
      title = `Missing required document: ${req.documentType} (conditional requirement confirmed)`;
      explanation = `This document is required when "${req.appliesWhen}". The applicant's own submitted category matches this condition, and no document of this type was uploaded.`;
    } else {
      severity = "review";
      title = `Possibly missing: ${req.documentType} (conditional)`;
      explanation = `This document is required when "${req.appliesWhen}". No document of this type was uploaded — confirm whether the condition applies to you.`;
    }

    findings.push({
      id: findingId(),
      requirementId: req.id,
      severity,
      category: "required_document",
      title,
      explanation,
      affectedDocuments: [],
      evidenceFactIds: [],
      sourceRequirementEvidence: req.sourceText,
      confidence: req.confidence,
      status: "candidate",
      origin: "deterministic",
    });
  }
  return findings;
}

/**
 * Very deliberately narrow: only resolves a conditional requirement TOWARD requiring the
 * document, and only on an explicit "applicant_category"-style fact whose value shares a
 * keyword with the requirement's appliesWhen text. Never infers the condition is false from
 * absence of evidence — that stays a "review" escalation, per checkRequiredDocumentPresence.
 */
function isConditionAffirmativelyConfirmed(appliesWhen: string, facts: ExtractedFact[]): boolean {
  const conditionKeywords = ["scheduled tribe", "scheduled caste", "obc", "st", "sc"];
  const appliesWhenLower = appliesWhen.toLowerCase();
  const categoryFacts = facts.filter((f) => f.field === "applicant_category" && typeof f.normalizedValue === "string");
  return categoryFacts.some((f) => {
    const value = String(f.normalizedValue).toLowerCase();
    return conditionKeywords.some((kw) => appliesWhenLower.includes(kw) && value.includes(kw));
  });
}

function checkCanonicalFactConflicts(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  for (const cf of input.canonicalFacts) {
    if (cf.status !== "conflict") continue;
    const severity = IDENTITY_FIELDS.has(cf.field) ? "critical" : "warning";
    findings.push({
      id: findingId(),
      requirementId: null,
      severity,
      category: "cross_document_consistency",
      title: `Conflicting ${cf.field.replace(/_/g, " ")} across documents`,
      explanation: `Different documents report different values for ${cf.field.replace(/_/g, " ")}: ${cf.observations
        .map((o) => `"${String(o.value)}" (${o.document})`)
        .join(" vs ")}.`,
      affectedDocuments: Array.from(new Set(cf.observations.map((o) => o.document))),
      evidenceFactIds: cf.observations.map((o) => o.factId),
      sourceRequirementEvidence: null,
      confidence: 0.9,
      status: "candidate",
      origin: "deterministic",
    });
  }
  return findings;
}

function checkFieldRuleRequirements(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  for (const req of input.manifest.requirements) {
    if (req.category !== "field_rule" || req.expectedValue === null || req.expectedValue === undefined) continue;
    if (!req.field) continue;
    // financial_year has its own dedicated check (checkFinancialYear) that applies proper
    // FY-string normalization ("2025-2026" == "2025-26") — skip it here to avoid a duplicate,
    // less-precise finding for the same underlying defect.
    if (req.field === "financial_year") continue;

    const matching = input.extractedFacts.filter((f) => f.field === req.field && f.normalizedValue !== null);
    if (matching.length === 0) continue; // covered by evidence-coverage check instead

    for (const fact of matching) {
      const matches = compareWithOperator(fact.normalizedValue as string | number | boolean, req.operator ?? "equals", req.expectedValue);
      if (matches) continue;
      findings.push({
        id: findingId(),
        requirementId: req.id,
        severity: "warning",
        category: "field_rule",
        title: `${req.field.replace(/_/g, " ")} does not meet stated rule`,
        explanation: `Requirement expects ${req.field} ${req.operator ?? "equals"} "${req.expectedValue}", but the packet shows "${fact.normalizedValue}" (${fact.documentId}).`,
        affectedDocuments: [fact.documentId],
        evidenceFactIds: [fact.id],
        sourceRequirementEvidence: req.sourceText,
        confidence: Math.min(req.confidence, fact.confidence),
        status: "candidate",
        origin: "deterministic",
      });
    }
  }
  return findings;
}

function compareWithOperator(actual: string | number | boolean, operator: string, expected: string | number): boolean {
  if (typeof actual === "number" && typeof expected === "number") {
    switch (operator) {
      case "gte": return actual >= expected;
      case "lte": return actual <= expected;
      case "gt": return actual > expected;
      case "lt": return actual < expected;
      case "equals": default: return actual === expected;
    }
  }
  return String(actual).trim().toLowerCase() === String(expected).trim().toLowerCase();
}

function checkCertificateExpiration(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  const submissionIso = parseFlexibleDate(input.config.submissionDate) ?? input.config.submissionDate;

  for (const fact of input.extractedFacts) {
    if (fact.field !== "expiry_date" || !fact.rawValue) continue;
    const expiryIso = parseFlexibleDate(fact.rawValue);
    if (!expiryIso) continue;
    if (expiryIso < submissionIso) {
      findings.push({
        id: findingId(),
        requirementId: null,
        severity: "critical",
        category: "document_validity",
        title: `Expired document: ${fact.documentType.replace(/_/g, " ")}`,
        explanation: `This document's expiry date (${fact.rawValue}) is before the audit date (${input.config.submissionDate}).`,
        affectedDocuments: [fact.documentId],
        evidenceFactIds: [fact.id],
        sourceRequirementEvidence: null,
        confidence: fact.confidence,
        status: "candidate",
        origin: "deterministic",
      });
    }
  }
  return findings;
}

function checkFinancialYear(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  const req = input.manifest.requirements.find((r) => r.category === "field_rule" && r.field === "financial_year");
  if (!req || req.expectedValue === null || req.expectedValue === undefined) return findings;
  const expected = normalizeFinancialYear(String(req.expectedValue)) ?? String(req.expectedValue);

  for (const fact of input.extractedFacts) {
    if (fact.field !== "financial_year" || !fact.rawValue) continue;
    const actual = normalizeFinancialYear(fact.rawValue) ?? fact.rawValue;
    if (actual !== expected) {
      findings.push({
        id: findingId(),
        requirementId: req.id,
        severity: "critical",
        category: "field_rule",
        title: "Wrong financial year on income/bank document",
        explanation: `Requirement specifies financial year ${expected}; document "${fact.documentId}" shows ${fact.rawValue}.`,
        affectedDocuments: [fact.documentId],
        evidenceFactIds: [fact.id],
        sourceRequirementEvidence: req.sourceText,
        confidence: Math.min(req.confidence, fact.confidence),
        status: "candidate",
        origin: "deterministic",
      });
    }
  }
  return findings;
}

function checkDeadline(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  const submissionIso = parseFlexibleDate(input.config.submissionDate) ?? input.config.submissionDate;

  for (const req of input.manifest.requirements) {
    if (req.category !== "deadline" || !req.expectedValue) continue;
    const deadlineIso = parseFlexibleDate(String(req.expectedValue));
    if (!deadlineIso) continue;
    if (submissionIso > deadlineIso) {
      findings.push({
        id: findingId(),
        requirementId: req.id,
        severity: "critical",
        category: "deadline",
        title: "Submission deadline has passed",
        explanation: `The stated deadline is ${req.expectedValue}; the audit is being run on ${input.config.submissionDate}.`,
        affectedDocuments: [],
        evidenceFactIds: [],
        sourceRequirementEvidence: req.sourceText,
        confidence: req.confidence,
        status: "candidate",
        origin: "deterministic",
      });
    }
  }
  return findings;
}

function checkFileFormat(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  const formatReq = input.manifest.requirements.find((r) => r.category === "format" && !r.documentType);
  for (const doc of input.documents) {
    if (!input.config.allowedMimeTypes.includes(doc.mimeType)) {
      findings.push({
        id: findingId(),
        requirementId: formatReq?.id ?? null,
        severity: "critical",
        category: "format",
        title: `Unsupported file format: ${doc.originalFilename}`,
        explanation: `File type "${doc.mimeType}" is not in the accepted formats (${input.config.allowedMimeTypes.join(", ")}).`,
        affectedDocuments: [doc.documentId],
        evidenceFactIds: [],
        sourceRequirementEvidence: formatReq?.sourceText ?? `Accepted formats: ${input.config.allowedMimeTypes.join(", ")}.`,
        confidence: 1,
        status: "candidate",
        origin: "deterministic",
      });
    }
    if (doc.fileSizeBytes > input.config.maxFileSizeBytes) {
      findings.push({
        id: findingId(),
        requirementId: formatReq?.id ?? null,
        severity: "warning",
        category: "format",
        title: `File too large: ${doc.originalFilename}`,
        explanation: `File is ${(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB, over the ${(input.config.maxFileSizeBytes / (1024 * 1024)).toFixed(0)} MB limit.`,
        affectedDocuments: [doc.documentId],
        evidenceFactIds: [],
        sourceRequirementEvidence: formatReq?.sourceText ?? `Maximum file size: ${(input.config.maxFileSizeBytes / (1024 * 1024)).toFixed(0)} MB.`,
        confidence: 1,
        status: "candidate",
        origin: "deterministic",
      });
    }
  }
  return findings;
}

function checkPageCount(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  for (const fact of input.extractedFacts) {
    if (fact.field !== "document_page_count" || fact.normalizedValue === null) continue;
    const req = input.manifest.requirements.find(
      (r) => r.category === "format" && r.field === "document_page_count" && r.documentType === fact.documentType,
    );
    if (!req || req.expectedValue === null || req.expectedValue === undefined) continue;
    if (Number(fact.normalizedValue) !== Number(req.expectedValue)) {
      findings.push({
        id: findingId(),
        requirementId: req.id,
        severity: "critical",
        category: "format",
        title: `Missing page(s): ${fact.documentType.replace(/_/g, " ")}`,
        explanation: `Requirement expects ${req.expectedValue} page(s); ${fact.documentId} has ${fact.normalizedValue}.`,
        affectedDocuments: [fact.documentId],
        evidenceFactIds: [fact.id],
        sourceRequirementEvidence: req.sourceText,
        confidence: fact.confidence,
        status: "candidate",
        origin: "deterministic",
      });
    }
  }
  return findings;
}

function checkSignaturePresence(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  const SIGNATURE_CONFIDENCE_THRESHOLD = 0.6;
  for (const fact of input.extractedFacts) {
    if (fact.field !== "signature_present") continue;
    if (fact.confidence < SIGNATURE_CONFIDENCE_THRESHOLD) continue; // too uncertain to assert — leave to human review via low-confidence path
    if (fact.normalizedValue === false) {
      const req = input.manifest.requirements.find((r) => r.category === "signature" && r.documentType === fact.documentType);
      findings.push({
        id: findingId(),
        requirementId: req?.id ?? null,
        severity: "critical",
        category: "signature",
        title: `Missing signature: ${fact.documentType.replace(/_/g, " ")}`,
        explanation: `No signature was detected on this document (confidence ${fact.confidence.toFixed(2)}).`,
        affectedDocuments: [fact.documentId],
        evidenceFactIds: [fact.id],
        sourceRequirementEvidence: req?.sourceText ?? null,
        confidence: fact.confidence,
        status: "candidate",
        origin: "deterministic",
      });
    }
  }
  return findings;
}

/** Requirements that are mandatory but have zero supporting evidence anywhere — can't be verified either way. */
function checkRequirementEvidenceCoverage(input: RuleEngineInput): Finding[] {
  const findings: Finding[] = [];
  for (const req of input.manifest.requirements) {
    if (!req.required || !req.field) continue;
    const hasEvidence = input.extractedFacts.some((f) => f.field === req.field);
    if (!hasEvidence) {
      findings.push({
        id: findingId(),
        requirementId: req.id,
        severity: "review",
        category: req.category,
        title: `Could not verify: ${req.field.replace(/_/g, " ")}`,
        explanation: `This requirement could not be checked because no extracted fact covers "${req.field}". Manual review needed.`,
        affectedDocuments: [],
        evidenceFactIds: [],
        sourceRequirementEvidence: req.sourceText,
        confidence: 0.5,
        status: "candidate",
        origin: "deterministic",
      });
    }
  }
  return findings;
}

/**
 * Every fact Node 3 marked requiresHumanConfirmation (low OCR confidence, illegible field,
 * handwritten correction, etc.) becomes a review-severity finding — input for Node 8, never a
 * hard pass/fail. This is what keeps a low-quality scan from silently becoming either a false
 * "everything's fine" or a false "this is broken": it's surfaced, not decided.
 */
function checkFieldsRequiringConfirmation(input: RuleEngineInput): Finding[] {
  return input.extractedFacts
    .filter((f) => f.requiresHumanConfirmation)
    .map((f) => ({
      id: findingId(),
      requirementId: null,
      severity: "review" as const,
      category: "needs_confirmation",
      title: `Needs confirmation: ${f.field.replace(/_/g, " ")} (${f.documentType.replace(/_/g, " ")})`,
      explanation: `This value could not be extracted with confidence (${f.confidence.toFixed(2)}). ${
        f.evidenceText ? `Nearest legible text: "${f.evidenceText}".` : "The field was illegible."
      } Please confirm manually.`,
      affectedDocuments: [f.documentId],
      evidenceFactIds: [f.id],
      sourceRequirementEvidence: null,
      confidence: f.confidence,
      status: "candidate" as const,
      origin: "deterministic" as const,
    }));
}

/** Surfaces anything Node 1 flagged as a possible prompt-injection attempt — always recorded, never acted on. */
function checkSuspectedInjection(input: RuleEngineInput): Finding[] {
  return input.manifest.suspectedInjection.map((s) => ({
    id: findingId(),
    requirementId: null,
    severity: "review" as const,
    category: "prompt_injection_detected",
    title: "Suspicious embedded instruction detected",
    explanation: `Text resembling an attempt to manipulate the audit ("${s.excerpt}") was found in "${s.sourceDocument}" and was ignored. It is recorded here for transparency and was not treated as a real requirement or used to mark anything complete.`,
    affectedDocuments: [s.sourceDocument],
    evidenceFactIds: [],
    sourceRequirementEvidence: s.excerpt,
    confidence: 0.95,
    status: "verified" as const, // this one doesn't need the adversarial/verifier pipeline — it's a direct, deterministic detection
    origin: "deterministic" as const,
  }));
}
