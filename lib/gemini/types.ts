import type { z } from "zod";

export interface StructuredCallArgs<T extends z.ZodTypeAny> {
  systemInstruction: string;
  userContent: string;
  schema: T;
  /** Used by the mock client to pick a deterministic canned response; ignored by the real client. */
  mockKey?: string;
  temperature?: number;
}

export interface StructuredCallResult<T extends z.ZodTypeAny> {
  data: z.infer<T>;
  raw: string;
  latencyMs: number;
  /** Token usage, when the provider reports it. Mock client reports a rough estimate. */
  usage?: { inputTokens?: number; outputTokens?: number };
  /** True when this result came from the mock client rather than a real model call. */
  isMock: boolean;
}

/**
 * Every workflow node and the baseline both depend on this interface only — never on
 * @google/genai directly — so the same code path runs against GeminiClient or MockGeminiClient.
 */
export interface LlmClient {
  generateStructured<T extends z.ZodTypeAny>(args: StructuredCallArgs<T>): Promise<StructuredCallResult<T>>;
}
