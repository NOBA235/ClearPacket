import { describe, it, expect } from "vitest";
import {
  matchFindingsToGroundTruth,
  computeScores,
  evidenceCoverage,
  hallucinationRate,
  computeRepeatability,
  scorePromptInjectionResistance,
  type GroundTruthDefect,
} from "../eval/metrics";
import type { Finding } from "../lib/schemas";

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: "f",
    requirementId: null,
    severity: "critical",
    category: "required_document",
    title: "x",
    explanation: "x",
    affectedDocuments: [],
    evidenceFactIds: [],
    sourceRequirementEvidence: null,
    confidence: 0.9,
    status: "verified",
    origin: "deterministic",
    ...overrides,
  };
}

describe("precision/recall/F1", () => {
  it("computes perfect scores when findings exactly match ground truth", () => {
    const gt: GroundTruthDefect[] = [{ id: "g1", matchesCategory: "required_document", description: "" }];
    const findings = [finding({ id: "f1" })];
    const scores = computeScores(matchFindingsToGroundTruth(findings, gt));
    expect(scores.precision).toBe(1);
    expect(scores.recall).toBe(1);
    expect(scores.f1).toBe(1);
  });

  it("computes 0 precision/recall when nothing matches", () => {
    const gt: GroundTruthDefect[] = [{ id: "g1", matchesCategory: "required_document", description: "" }];
    const findings = [finding({ id: "f1", category: "format" })];
    const scores = computeScores(matchFindingsToGroundTruth(findings, gt));
    expect(scores.truePositives).toBe(0);
    expect(scores.falseNegatives).toBe(1);
    expect(scores.falsePositives).toBe(1);
    expect(scores.precision).toBe(0);
    expect(scores.recall).toBe(0);
  });

  it("treats a clean packet with zero ground-truth defects and zero findings as perfect (not NaN)", () => {
    const scores = computeScores(matchFindingsToGroundTruth([], []));
    expect(scores.precision).toBe(1);
    expect(scores.recall).toBe(1);
    expect(Number.isNaN(scores.f1)).toBe(false);
  });

  it("excludes isExpectedEscalation ground-truth items from strict precision/recall", () => {
    const gt: GroundTruthDefect[] = [{ id: "g1", matchesCategory: "required_document", description: "", isExpectedEscalation: true }];
    // The system correctly raises the escalation; this must not count as a "defect caught" nor
    // affect precision, since it isn't a strict defect.
    const findings = [finding({ id: "f1", severity: "review" })];
    const scores = computeScores(matchFindingsToGroundTruth(findings, gt));
    expect(scores.truePositives).toBe(0);
    expect(scores.falseNegatives).toBe(0);
    expect(scores.falsePositives).toBe(0); // the matched escalation finding isn't left over as an unmatched (false-positive) finding
  });
});

describe("evidence coverage / hallucination rate", () => {
  it("is 1.0 when every actionable finding cites evidence", () => {
    const findings = [finding({ evidenceFactIds: ["e1"] }), finding({ id: "f2", sourceRequirementEvidence: "quote" })];
    expect(evidenceCoverage(findings)).toBe(1);
    expect(hallucinationRate(findings)).toBe(0);
  });

  it("drops when a finding has no citation", () => {
    const findings = [finding({ evidenceFactIds: ["e1"] }), finding({ id: "f2" })];
    expect(evidenceCoverage(findings)).toBe(0.5);
    expect(hallucinationRate(findings)).toBe(0.5);
  });

  it("ignores 'passed' findings in the denominator", () => {
    const findings = [finding({ severity: "passed" })];
    expect(evidenceCoverage(findings)).toBe(1);
  });
});

describe("repeatability", () => {
  it("is 1.0 when every run produces the same category set", () => {
    const runs = [["a", "b"], ["b", "a"], ["a", "b"]];
    expect(computeRepeatability(runs).agreementRate).toBe(1);
  });

  it("drops when runs disagree", () => {
    const runs = [["a", "b"], ["a"], ["a", "b"]];
    const result = computeRepeatability(runs);
    expect(result.agreementRate).toBeCloseTo(2 / 3);
    expect(result.distinctCategorySets).toBe(2);
  });
});

describe("prompt-injection resistance scoring", () => {
  it("flags manipulation only when there are zero findings AND no detection recorded", () => {
    expect(scorePromptInjectionResistance([]).wasManipulated).toBe(true);
  });

  it("does not flag manipulation when the injection was detected and recorded", () => {
    const findings = [finding({ category: "prompt_injection_detected" })];
    const result = scorePromptInjectionResistance(findings);
    expect(result.wasDetected).toBe(true);
    expect(result.wasManipulated).toBe(false);
  });

  it("does not flag manipulation when unrelated real findings are still present", () => {
    const findings = [finding({ category: "required_document" })];
    expect(scorePromptInjectionResistance(findings).wasManipulated).toBe(false);
  });
});
