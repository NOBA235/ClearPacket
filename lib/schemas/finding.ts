import { z } from "zod";

export const FindingSeverity = z.enum(["critical", "warning", "review", "passed"]);
export type FindingSeverity = z.infer<typeof FindingSeverity>;

export const FindingStatus = z.enum(["candidate", "verified", "rejected", "human_review"]);
export type FindingStatus = z.infer<typeof FindingStatus>;

export const FindingSchema = z.object({
  id: z.string(),
  requirementId: z.string().nullable().optional(),
  severity: FindingSeverity,
  category: z.string(),
  title: z.string(),
  explanation: z.string(),
  affectedDocuments: z.array(z.string()),
  evidenceFactIds: z.array(z.string()),
  sourceRequirementEvidence: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  status: FindingStatus,
  // Provenance — did this originate in the deterministic engine or the adversarial LLM pass?
  origin: z.enum(["deterministic", "adversarial"]).default("deterministic"),
});
export type Finding = z.infer<typeof FindingSchema>;

/** Node 7 output: an independent verification verdict attached to a candidate finding. */
export const VerificationVerdictSchema = z.object({
  findingId: z.string(),
  requirementExists: z.boolean(),
  requirementIsMandatory: z.union([z.literal("mandatory"), z.literal("conditional"), z.literal("recommended")]),
  evidenceExists: z.boolean(),
  conflictRealAfterNormalization: z.boolean(),
  plausibleOcrExplanation: z.boolean(),
  fullySupported: z.boolean(),
  decision: z.enum(["verified", "rejected", "escalate_to_student"]),
  reasoning: z.string(),
});
export type VerificationVerdict = z.infer<typeof VerificationVerdictSchema>;

/** Node 8: a question posed to the student, and their answer recorded separately from extracted facts. */
export const ClarificationQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  relatedFactIds: z.array(z.string()),
  answer: z.string().nullable().default(null),
  answeredAt: z.string().datetime().nullable().default(null),
});
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

/** Node 9 output: the prioritized, evidence-backed correction checklist. */
export const CorrectionPriority = z.enum([
  "possible_disqualifying_problem",
  "missing_mandatory_document",
  "identity_or_factual_conflict",
  "expired_documentation",
  "formatting_or_file_problem",
  "requires_human_review",
]);
export type CorrectionPriority = z.infer<typeof CorrectionPriority>;

export const ChecklistItemSchema = z.object({
  id: z.string(),
  findingId: z.string(),
  priority: CorrectionPriority,
  whatAppearsWrong: z.string(),
  whyItMatters: z.string(),
  relevantRequirement: z.string().nullable(),
  requirementSource: z.string().nullable(),
  applicantEvidence: z.string().nullable(),
  recommendedNextAction: z.string(),
  confidence: z.number().min(0).max(1),
  humanReviewStatus: z.enum(["not_required", "pending", "resolved"]),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
