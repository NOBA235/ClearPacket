import { z } from "zod";
import { ChecklistItemSchema, type ChecklistItem, type Finding } from "../schemas";
import { NODE9_SYSTEM_INSTRUCTION, NODE9_USER_TEMPLATE } from "../prompts/node9-correction-planner";
import type { LlmClient } from "../gemini/types";

const ChecklistSchema = z.object({ items: z.array(ChecklistItemSchema) });

export async function runNode9CorrectionPlanner(
  client: LlmClient,
  verifiedFindings: Finding[],
  mockKey: string,
): Promise<{ checklist: ChecklistItem[]; latencyMs: number; isMock: boolean }> {
  const result = await client.generateStructured({
    systemInstruction: NODE9_SYSTEM_INSTRUCTION,
    userContent: NODE9_USER_TEMPLATE(JSON.stringify(verifiedFindings)),
    schema: ChecklistSchema,
    mockKey,
    temperature: 0.1,
  });
  return { checklist: result.data.items, latencyMs: result.latencyMs, isMock: result.isMock };
}
