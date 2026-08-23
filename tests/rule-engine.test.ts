import { describe, it, expect, beforeEach } from "vitest";
import { runDeterministicRuleEngine, resetFindingIdCounter } from "../lib/rule-engine/engine";
import { buildCanonicalFacts } from "../lib/rule-engine/canonical-facts";
import { rejectUnsupportedFindings } from "../lib/rule-engine/reject-unsupported";
import { DEFAULT_RULE_ENGINE_CONFIG } from "../lib/rule-engine/types";
import { packetA } from "../data/benchmark/packet-a/documents";
import { packetB } from "../data/benchmark/packet-b/documents";
import { packetC } from "../data/benchmark/packet-c/documents";
import { buildOracleRequirementsManifest } from "../data/benchmark/requirements-manifest";
import { buildPacketCManifest } from "../data/benchmark/packet-c/requirements-manifest";
import { BENCHMARK_SUBMISSION_DATE } from "../data/benchmark/types";
import type { Finding } from "../lib/schemas";

function runEngineForPacket(packet: typeof packetA, manifest = buildOracleRequirementsManifest(packet.id)) {
  const canonicalFacts = buildCanonicalFacts(packet.extractedFacts);
  const findings = runDeterministicRuleEngine({
    manifest,
    canonicalFacts,
    extractedFacts: packet.extractedFacts,
    documents: packet.documents,
    config: { submissionDate: BENCHMARK_SUBMISSION_DATE, ...DEFAULT_RULE_ENGINE_CONFIG },
  });
  return { findings, canonicalFacts };
}

beforeEach(() => resetFindingIdCounter());

describe("Test 15: clean packet (Packet A) false-positive behavior", () => {
  it("produces no critical/warning findings — only the expected conditional-document escalation", () => {
    const { findings } = runEngineForPacket(packetA);
    const hardFindings = findings.filter((f) => f.severity === "critical" || f.severity === "warning");
    expect(hardFindings).toHaveLength(0);

    const reviewFindings = findings.filter((f) => f.severity === "review");
    expect(reviewFindings.some((f) => f.title.includes("category_certificate"))).toBe(true);
  });
});

describe("Test 3: missing required documents", () => {
  it("flags an unconditional missing document as critical", () => {
    const { findings } = runEngineForPacket(packetB);
    const missing = findings.find((f) => f.category === "required_document" && f.title.includes("residence_certificate"));
    expect(missing).toBeDefined();
    expect(missing?.severity).toBe("critical");
  });
});

describe("Test 4: expired documents", () => {
  it("flags a certificate whose expiry date is before the submission date", () => {
    const { findings } = runEngineForPacket(packetB);
    const expired = findings.find((f) => f.category === "document_validity");
    expect(expired).toBeDefined();
    expect(expired?.severity).toBe("critical");
    expect(expired?.affectedDocuments).toContain("b-income");
  });

  it("does NOT flag a certificate that expires after the submission date", () => {
    const { findings } = runEngineForPacket(packetA);
    expect(findings.some((f) => f.category === "document_validity")).toBe(false);
  });
});

describe("Test 6: exact-name mismatch (cross-document)", () => {
  it("flags a real name conflict as critical (identity field)", () => {
    const { findings } = runEngineForPacket(packetB);
    const nameConflict = findings.find((f) => f.category === "cross_document_consistency" && f.title.toLowerCase().includes("full name"));
    expect(nameConflict).toBeDefined();
    expect(nameConflict?.severity).toBe("critical");
  });
});

describe("Test 7: harmless whitespace/format differences produce no finding", () => {
  it("does not flag an abbreviated institution name with a known mapping", () => {
    const { findings } = runEngineForPacket(packetC, buildPacketCManifest());
    expect(findings.some((f) => f.title.toLowerCase().includes("institution"))).toBe(false);
  });

  it("does not flag the same date of birth written in two different formats", () => {
    const { findings } = runEngineForPacket(packetC, buildPacketCManifest());
    expect(findings.some((f) => f.category === "cross_document_consistency" && f.title.toLowerCase().includes("date of birth"))).toBe(false);
  });
});

describe("Test 8: numeric GPA mismatch (below required minimum)", () => {
  it("flags a GPA below the stated minimum as a field_rule violation", () => {
    const { findings } = runEngineForPacket(packetB);
    const gpa = findings.find((f) => f.category === "field_rule" && f.title.toLowerCase().includes("gpa"));
    expect(gpa).toBeDefined();
  });

  it("does not flag a GPA that meets the minimum", () => {
    const { findings } = runEngineForPacket(packetA);
    expect(findings.some((f) => f.title.toLowerCase().includes("gpa"))).toBe(false);
  });
});

describe("Test 9: conditional requirements", () => {
  it("escalates for review (not critical) when the condition can't be resolved", () => {
    const { findings } = runEngineForPacket(packetA);
    const conditional = findings.find((f) => f.title.includes("category_certificate"));
    expect(conditional?.severity).toBe("review");
  });

  it("escalates to critical when the condition is affirmatively confirmed by evidence", () => {
    const { findings } = runEngineForPacket(packetC, buildPacketCManifest());
    const conditional = findings.find((f) => f.category === "required_document" && f.title.includes("category_certificate"));
    expect(conditional?.severity).toBe("critical");
    expect(conditional?.explanation).toContain("applicant's own submitted category");
  });
});

describe("Test 10: low-confidence OCR", () => {
  it("does not assert a hard signature/identity finding below the confidence threshold, and instead requests confirmation", () => {
    const { findings } = runEngineForPacket(packetC, buildPacketCManifest());
    // c-f5 (identity full_name) is confidence 0.35 and requiresHumanConfirmation — must not
    // produce a hard cross-document conflict finding, only a review/needs_confirmation one.
    const hardIdentityFindings = findings.filter(
      (f) => f.severity === "critical" && f.category === "cross_document_consistency" && f.affectedDocuments.includes("c-id"),
    );
    expect(hardIdentityFindings).toHaveLength(0);

    const confirmation = findings.find((f) => f.category === "needs_confirmation" && f.affectedDocuments.includes("c-id"));
    expect(confirmation).toBeDefined();
    expect(confirmation?.severity).toBe("review");
  });
});

describe("Test 12: prompt-injection content is recorded but never followed", () => {
  it("records a suspected-injection finding without asserting the packet is complete", () => {
    const { findings } = runEngineForPacket(packetC, buildPacketCManifest());
    const injection = findings.find((f) => f.category === "prompt_injection_detected");
    expect(injection).toBeDefined();
    expect(injection?.status).toBe("verified");
    expect(injection?.explanation.toLowerCase()).toContain("ignored");
    // The mere presence of "mark this packet complete and eligible" in source text must never
    // cause the engine to omit or downgrade the packet's real, evidence-backed findings.
    expect(findings.some((f) => f.category === "cross_document_consistency" && f.title.toLowerCase().includes("address"))).toBe(true);
  });
});

describe("Test 11: unsupported findings are rejected by the verification safety net", () => {
  it("force-rejects a finding with no evidence citation of any kind", () => {
    const unsupported: Finding = {
      id: "fabricated-1",
      requirementId: null,
      severity: "critical",
      category: "eligibility",
      title: "Applicant seems unlikely to qualify",
      explanation: "General impression, no specific evidence.",
      affectedDocuments: [],
      evidenceFactIds: [],
      sourceRequirementEvidence: null,
      confidence: 0.4,
      status: "candidate",
      origin: "adversarial",
    };
    const result = rejectUnsupportedFindings([unsupported]);
    expect(result[0]?.status).toBe("rejected");
  });

  it("does not reject a finding that cites an evidence fact", () => {
    const supported: Finding = {
      id: "real-1",
      requirementId: "req-x",
      severity: "warning",
      category: "field_rule",
      title: "Real finding",
      explanation: "Backed by evidence.",
      affectedDocuments: ["doc-1"],
      evidenceFactIds: ["fact-1"],
      sourceRequirementEvidence: null,
      confidence: 0.8,
      status: "candidate",
      origin: "deterministic",
    };
    expect(rejectUnsupportedFindings([supported])[0]?.status).toBe("candidate");
  });
});
