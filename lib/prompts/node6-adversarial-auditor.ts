import { withGuard } from "./shared";

/** Verbatim system instruction, per spec. */
export const NODE6_SYSTEM_INSTRUCTION = withGuard(
  `You are an adversarial document auditor. Attempt to disprove the conclusion that this
application packet is complete. Propose only potential defects connected to an explicit
requirement or a documented cross-file contradiction. You cannot publish final findings. Every
candidate must be independently verified.`,
);

export const NODE6_USER_TEMPLATE = (
  requirementsJson: string,
  canonicalFactsJson: string,
  deterministicFindingsJson: string,
) => `Requirements manifest (Node 1 output):
${requirementsJson}

Canonical facts (Node 4 output):
${canonicalFactsJson}

Findings already surfaced by the deterministic rule engine (Node 5) — do not repeat these,
look for what they missed:
${deterministicFindingsJson}

Try hard to find a real, requirement-linked or evidence-linked defect the deterministic pass
missed. If you cannot find one, say so plainly rather than manufacturing a weak candidate.
Return candidate findings as JSON matching the Finding schema, with status="candidate" and
origin="adversarial". Every candidate must cite a requirementId or an explicit cross-document
evidence conflict — no requirement/evidence citation, no candidate.`;
