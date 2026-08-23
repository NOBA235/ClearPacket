import { z } from "zod";
import { ExtractedFactSchema, type ExtractedFact } from "../schemas";
import { NODE3_SYSTEM_INSTRUCTION, NODE3_USER_TEMPLATE } from "../prompts/node3-evidence-extractor";
import type { LlmClient } from "../gemini/types";

const ExtractedFactListSchema = z.object({ facts: z.array(ExtractedFactSchema) });

export async function runNode3EvidenceExtractor(
  client: LlmClient,
  documentId: string,
  documentType: string,
  documentText: string,
  mockKey: string,
): Promise<{ facts: ExtractedFact[]; latencyMs: number; isMock: boolean }> {
  const result = await client.generateStructured({
    systemInstruction: NODE3_SYSTEM_INSTRUCTION,
    userContent: NODE3_USER_TEMPLATE(documentId, documentType, documentText),
    schema: ExtractedFactListSchema,
    mockKey,
    temperature: 0,
  });
  return { facts: result.data.facts, latencyMs: result.latencyMs, isMock: result.isMock };
}
