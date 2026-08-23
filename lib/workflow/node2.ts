import { DocumentClassificationSchema, type DocumentClassification } from "../schemas";
import { NODE2_SYSTEM_INSTRUCTION, NODE2_USER_TEMPLATE } from "../prompts/node2-document-router";
import type { LlmClient } from "../gemini/types";

export async function runNode2DocumentRouter(
  client: LlmClient,
  documentId: string,
  documentText: string,
  mockKey: string,
): Promise<{ classification: DocumentClassification; latencyMs: number; isMock: boolean }> {
  const result = await client.generateStructured({
    systemInstruction: NODE2_SYSTEM_INSTRUCTION,
    userContent: NODE2_USER_TEMPLATE(documentId, documentText),
    schema: DocumentClassificationSchema,
    mockKey,
    temperature: 0,
  });
  return { classification: result.data, latencyMs: result.latencyMs, isMock: result.isMock };
}
