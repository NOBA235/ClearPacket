import { z } from "zod";

export const DocumentType = z.enum([
  "application_form",
  "identity_document",
  "transcript",
  "income_certificate",
  "residence_certificate",
  "category_certificate",
  "bank_document",
  "recommendation_letter",
  "statement_of_purpose",
  "official_instructions",
  "unknown",
]);
export type DocumentType = z.infer<typeof DocumentType>;

/** Node 2 output: one classification per uploaded document. */
export const DocumentClassificationSchema = z.object({
  documentId: z.string(),
  documentType: DocumentType,
  confidence: z.number().min(0).max(1),
  alternativeClassifications: z
    .array(z.object({ documentType: DocumentType, confidence: z.number().min(0).max(1) }))
    .default([]),
  requiresHumanConfirmation: z.boolean(),
});
export type DocumentClassification = z.infer<typeof DocumentClassificationSchema>;

/** Node 3 output: one row per extracted field per document. Never infers — unreadable/missing is null. */
export const ExtractedFactSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentType: DocumentType,
  field: z.string(),
  rawValue: z.string().nullable(),
  normalizedValue: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  sourcePage: z.number().int().positive().nullable().optional(),
  evidenceText: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  readable: z.boolean(),
  requiresHumanConfirmation: z.boolean(),
});
export type ExtractedFact = z.infer<typeof ExtractedFactSchema>;

/** Node 4 output: facts about the same applicant attribute, grouped and status-flagged. */
export const CanonicalFactObservationSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  document: z.string(),
  factId: z.string(),
});

export const CanonicalFactStatus = z.enum(["agree", "harmless_variation", "conflict", "insufficient_evidence"]);
export type CanonicalFactStatus = z.infer<typeof CanonicalFactStatus>;

export const CanonicalFactSchema = z.object({
  field: z.string(),
  observations: z.array(CanonicalFactObservationSchema),
  status: CanonicalFactStatus,
  requiresHumanConfirmation: z.boolean(),
  confirmedValue: z.union([z.string(), z.number(), z.boolean()]).nullable().optional(),
  confirmedByUser: z.boolean().default(false),
  normalizationNote: z.string().nullable().optional(),
});
export type CanonicalFact = z.infer<typeof CanonicalFactSchema>;
