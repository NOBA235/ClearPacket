/**
 * The baseline is intentionally the SAME model, the SAME documents, and a straightforward,
 * competent single-prompt instruction — not a strawman. Do not weaken this to make ClearPacket
 * look better; see docs/evaluation.md for the fairness rationale.
 */
export const BASELINE_SYSTEM_INSTRUCTION = `You are an expert scholarship application reviewer.`;

export const BASELINE_USER_TEMPLATE = (allDocumentsText: string) => `Review the attached scholarship requirements and application documents. Determine whether the application is complete and correct. List missing documents, inconsistencies, eligibility concerns and recommended corrections.

Documents:

${allDocumentsText}

Respond with a structured JSON object: { "findings": [ { "title": string, "explanation": string, "severity": "critical"|"warning"|"review"|"passed", "evidenceQuote": string | null } ] }`;
