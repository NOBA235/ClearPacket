import { BASELINE_SYSTEM_INSTRUCTION, BASELINE_USER_TEMPLATE } from "../lib/prompts/baseline";
import { BaselineResponseSchema, type BaselineFinding } from "./categorize-baseline";
import type { LlmClient } from "../lib/gemini/types";
import type { BenchmarkPacket } from "../data/benchmark/types";
import { OFFICIAL_NOTICE_TEXT } from "../data/benchmark";

export interface BaselineRunResult {
  findings: BaselineFinding[];
  latencyMs: number;
  isMock: boolean;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export async function runBaseline(client: LlmClient, packet: BenchmarkPacket): Promise<BaselineRunResult> {
  const allDocumentsText = `${OFFICIAL_NOTICE_TEXT}\n\n${packet.rawDocumentText}`;
  const result = await client.generateStructured({
    systemInstruction: BASELINE_SYSTEM_INSTRUCTION,
    userContent: BASELINE_USER_TEMPLATE(allDocumentsText),
    schema: BaselineResponseSchema,
    mockKey: `baseline:${packet.id}`,
    temperature: 0.2,
  });
  return { findings: result.data.findings, latencyMs: result.latencyMs, isMock: result.isMock, usage: result.usage };
}
