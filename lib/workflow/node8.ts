import { z } from "zod";
import { type Finding, type ExtractedFact } from "../schemas";
import { NODE8_SYSTEM_INSTRUCTION, NODE8_USER_TEMPLATE } from "../prompts/node8-clarification";
import type { LlmClient } from "../gemini/types";

const QuestionDraftSchema = z.object({ question: z.string(), relatedFactIds: z.array(z.string()) });

export async function runNode8Clarification(
  client: LlmClient,
  finding: Finding,
  relatedFacts: ExtractedFact[],
  mockKey: string,
): Promise<{ question: string; relatedFactIds: string[]; latencyMs: number; isMock: boolean }> {
  const result = await client.generateStructured({
    systemInstruction: NODE8_SYSTEM_INSTRUCTION,
    userContent: NODE8_USER_TEMPLATE(JSON.stringify(finding), JSON.stringify(relatedFacts)),
    schema: QuestionDraftSchema,
    mockKey,
    temperature: 0.2,
  });
  return { question: result.data.question, relatedFactIds: result.data.relatedFactIds, latencyMs: result.latencyMs, isMock: result.isMock };
}
