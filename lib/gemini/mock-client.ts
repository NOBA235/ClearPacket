import type { z } from "zod";
import type { LlmClient, StructuredCallArgs, StructuredCallResult } from "./types";

/**
 * MockGeminiClient — NOT a model. It returns hand-authored, fixed fixture data keyed by
 * `mockKey`, so the app, tests, and eval harness can run end-to-end without network access or
 * an API key.
 *
 * Every result is stamped `isMock: true`. Every place that displays or scores a mock result
 * MUST show "MOCK — not a real model result" — see components/MockBadge.tsx and
 * docs/evaluation.md. This client exists to prove the pipeline plumbing is correct, never to
 * stand in for real benchmark numbers.
 */
export class MockGeminiClient implements LlmClient {
  constructor(private fixtures: Record<string, unknown>) {}

  async generateStructured<T extends z.ZodTypeAny>(args: StructuredCallArgs<T>): Promise<StructuredCallResult<T>> {
    const started = Date.now();
    if (!args.mockKey || !(args.mockKey in this.fixtures)) {
      throw new Error(
        `MockGeminiClient has no fixture for mockKey="${args.mockKey}". Add one in data/benchmark/**/mock-responses.ts — the mock client never invents data.`,
      );
    }
    const candidate = this.fixtures[args.mockKey];
    const data = args.schema.parse(candidate);
    // Simulate a small, realistic-shaped latency so timing charts aren't literally zero;
    // clearly not a real network round trip.
    const latencyMs = 40 + Math.floor(Math.random() * 60);
    await new Promise((r) => setTimeout(r, 0));
    return {
      data,
      raw: JSON.stringify(candidate),
      latencyMs: Date.now() - started + latencyMs,
      usage: { inputTokens: estimateTokens(args.userContent), outputTokens: estimateTokens(JSON.stringify(candidate)) },
      isMock: true,
    };
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
