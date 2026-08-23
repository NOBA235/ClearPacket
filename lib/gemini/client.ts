import { z } from "zod";
import type { LlmClient, StructuredCallArgs, StructuredCallResult } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Thin wrapper over the Gemini REST API using responseSchema for structured JSON output.
 *
 * IMPORTANT: only ever instantiate this from server-side code — a Next.js Server Component,
 * Route Handler, or Server Action, or this project's standalone `eval/runner.ts` CLI. Never
 * import it into a `"use client"` component: GEMINI_API_KEY must not reach the browser bundle.
 * (This file intentionally does NOT import Next.js's `server-only` guard package, because
 * `eval/runner.ts` also imports it as a plain Node/tsx script outside the Next.js build, where
 * that guard throws unconditionally. If you only ever call this from Next.js server code, you
 * can add `import "server-only"` back locally — see docs/privacy-and-limitations.md.)
 *
 * NOTE: this class was written and type-checked but could not be exercised in the build
 * sandbox — that environment has no network path to generativelanguage.googleapis.com.
 * Wire GEMINI_API_KEY in your own environment and run `npm run eval:all` to get real numbers.
 */
export class GeminiClient implements LlmClient {
  constructor(private apiKey: string = process.env.GEMINI_API_KEY ?? "") {
    if (!this.apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example) or use MockGeminiClient for local development.",
      );
    }
  }

  async generateStructured<T extends z.ZodTypeAny>(args: StructuredCallArgs<T>): Promise<StructuredCallResult<T>> {
    const started = Date.now();
    const body = {
      systemInstruction: { parts: [{ text: args.systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: args.userContent }] }],
      generationConfig: {
        temperature: args.temperature ?? 0.1,
        responseMimeType: "application/json",
        responseSchema: zodToGeminiSchema(args.schema),
      },
    };

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = args.schema.parse(JSON.parse(raw));

    return {
      data: parsed,
      raw,
      latencyMs: Date.now() - started,
      usage: {
        inputTokens: json.usageMetadata?.promptTokenCount,
        outputTokens: json.usageMetadata?.candidatesTokenCount,
      },
      isMock: false,
    };
  }
}

/**
 * Minimal, conservative Zod -> Gemini JSON-schema converter covering the subset of Zod this
 * project actually uses (object, array, enum, string, number, boolean, nullable, optional,
 * union of primitives). Not a general-purpose converter.
 */
function zodToGeminiSchema(schema: z.ZodTypeAny): unknown {
  const def = (schema as z.ZodTypeAny)._def as { typeName: string };

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToGeminiSchema(value);
      if (!value.isOptional() && !value.isNullable()) required.push(key);
    }
    return { type: "object", properties, required };
  }
  if (schema instanceof z.ZodArray) {
    return { type: "array", items: zodToGeminiSchema(schema.element) };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: "string", enum: schema.options };
  }
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
    return zodToGeminiSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return zodToGeminiSchema(schema.removeDefault());
  }
  if (schema instanceof z.ZodUnion) {
    const options = (schema.options as z.ZodTypeAny[]).map(zodToGeminiSchema);
    return options[0] ?? { type: "string" };
  }
  if (schema instanceof z.ZodString) return { type: "string" };
  if (schema instanceof z.ZodNumber) return { type: "number" };
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };
  return { type: "string" };
}
