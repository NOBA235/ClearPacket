import { z } from "zod";

/**
 * A single, source-cited requirement extracted from official scholarship
 * documents by Node 1 (Requirement Compiler).
 *
 * Every requirement must be traceable to exact source text. Nothing here
 * may be filled in from general scholarship knowledge — see
 * docs/prompts.md for the extraction contract.
 */
export const RequirementCategory = z.enum([
  "eligibility",
  "required_document",
  "field_rule",
  "document_validity",
  "format",
  "deadline",
  "signature",
  "cross_document_consistency",
]);
export type RequirementCategory = z.infer<typeof RequirementCategory>;

export const RequirementSchema = z.object({
  id: z.string().min(1),
  category: RequirementCategory,
  description: z.string().min(1),
  required: z.boolean(),
  appliesWhen: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  field: z.string().nullable().optional(),
  operator: z.string().nullable().optional(),
  expectedValue: z.union([z.string(), z.number()]).nullable().optional(),
  // Exact evidence trail — mandatory. A requirement with no source is not a requirement.
  sourceDocument: z.string().min(1),
  sourcePage: z.number().int().positive().nullable().optional(),
  sourceText: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const RequirementManifestSchema = z.object({
  auditId: z.string(),
  requirements: z.array(RequirementSchema),
  // Node 1 must record anything it found ambiguous rather than silently guessing.
  ambiguousNotes: z.array(z.object({ note: z.string(), sourceText: z.string() })).default([]),
  // If the model noticed embedded instructions in the source docs, it goes here — never followed.
  suspectedInjection: z.array(z.object({ sourceDocument: z.string(), excerpt: z.string() })).default([]),
});
export type RequirementManifest = z.infer<typeof RequirementManifestSchema>;
