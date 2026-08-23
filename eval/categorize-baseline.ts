import { z } from "zod";
import type { Finding } from "../lib/schemas";

export const BaselineFindingSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  severity: z.enum(["critical", "warning", "review", "passed"]),
  evidenceQuote: z.string().nullable(),
});
export const BaselineResponseSchema = z.object({ findings: z.array(BaselineFindingSchema) });
export type BaselineFinding = z.infer<typeof BaselineFindingSchema>;

/**
 * The baseline prompt (see lib/prompts/baseline.ts) does not ask for a structured category,
 * evidence-fact IDs, or a requirement citation — it is intentionally the plain, single-prompt
 * approach a developer would reach for first. To score it against the same ground truth as
 * ClearPacket, we need SOME translation layer; this keyword categorizer is that layer. It is
 * necessarily approximate, and it is applied identically to every baseline run — it does not
 * know which packet it's scoring, so it cannot be tuned to make the baseline look worse. See
 * docs/evaluation.md "Baseline scoring methodology" for the full rationale and limitation.
 */
const CATEGORY_KEYWORDS: Array<[Finding["category"], string[]]> = [
  ["prompt_injection_detected", ["ignore all previous instructions", "prompt injection", "instruction override"]],
  ["required_document", ["missing document", "no residence", "not submitted", "did not submit", "not uploaded", "missing residence", "missing category certificate", "category certificate"]],
  ["document_validity", ["expired", "no longer valid"]],
  ["signature", ["signature", "unsigned"]],
  ["format", ["file format", "file type", "page count", "pages", "too large", "wrong format"]],
  ["field_rule", ["financial year", "cgpa", "gpa", "grade point"]],
  ["cross_document_consistency", ["name", "date of birth", "address", "account holder", "mismatch", "inconsistent", "does not match"]],
];

export function categorizeBaselineFinding(finding: BaselineFinding): string {
  const haystack = `${finding.title} ${finding.explanation}`.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) return category;
  }
  return "uncategorized";
}

/**
 * Maps baseline output into the same Finding shape ClearPacket produces, so both can go
 * through the identical eval/metrics.ts scoring functions. affectedDocuments is always []
 * because the baseline prompt was never asked to cite which document a claim came from —
 * that gap (baseline can't point to a specific file) is itself part of the comparison story.
 */
export function baselineFindingsToFindings(baseline: BaselineFinding[]): Finding[] {
  return baseline.map((b, i) => ({
    id: `baseline-${i}`,
    requirementId: null,
    severity: b.severity,
    category: categorizeBaselineFinding(b),
    title: b.title,
    explanation: b.explanation,
    affectedDocuments: [],
    evidenceFactIds: [],
    sourceRequirementEvidence: null,
    confidence: 0.5, // baseline never states a confidence — treated as unsupported for evidence-coverage purposes
    status: "candidate",
    origin: "deterministic",
  }));
}

/** Evidence coverage for baseline findings uses evidenceQuote instead of evidenceFactIds, since the baseline schema has no fact IDs to cite. */
export function baselineEvidenceCoverage(baseline: BaselineFinding[]): number {
  const actionable = baseline.filter((f) => f.severity !== "passed");
  if (actionable.length === 0) return 1;
  const supported = actionable.filter((f) => !!f.evidenceQuote && f.evidenceQuote.trim().length > 0).length;
  return supported / actionable.length;
}
