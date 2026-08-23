import type { Finding } from "../schemas";

/**
 * Hard, deterministic backstop applied AFTER Node 7 verification (real or mock): any finding
 * that still carries neither an evidence fact citation nor an exact requirement-source
 * citation is force-rejected, regardless of what a verifier said. This is deliberately
 * stricter than trusting the LLM verifier alone — "No candidate becomes a final finding
 * without this stage" per spec, and this stage does not trust a single model call to be the
 * only thing standing between an unsupported claim and the student's checklist.
 *
 * The one exception is prompt_injection_detected findings, which cite an exact excerpt in
 * sourceRequirementEvidence rather than a structured evidence fact — those still pass because
 * they DO carry a citation, just not via evidenceFactIds.
 */
export function rejectUnsupportedFindings(findings: Finding[]): Finding[] {
  return findings.map((f) => {
    if (f.status === "rejected") return f;
    const hasEvidence = f.evidenceFactIds.length > 0 || !!f.sourceRequirementEvidence;
    if (hasEvidence) return f;
    return { ...f, status: "rejected" as const, explanation: `${f.explanation} [Rejected: no evidence citation — see docs/evaluation.md.]` };
  });
}
