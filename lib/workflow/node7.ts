import { VerificationVerdictSchema, type VerificationVerdict, type Finding, type RequirementManifest, type CanonicalFact } from "../schemas";
import { NODE7_SYSTEM_INSTRUCTION, NODE7_USER_TEMPLATE } from "../prompts/node7-verifier";
import type { LlmClient } from "../gemini/types";

export async function runNode7Verifier(
  client: LlmClient,
  candidate: Finding,
  manifest: RequirementManifest,
  canonicalFacts: CanonicalFact[],
  mockKey: string,
): Promise<{ verdict: VerificationVerdict; latencyMs: number; isMock: boolean }> {
  const result = await client.generateStructured({
    systemInstruction: NODE7_SYSTEM_INSTRUCTION,
    userContent: NODE7_USER_TEMPLATE(JSON.stringify(candidate), JSON.stringify(manifest.requirements), JSON.stringify(canonicalFacts)),
    schema: VerificationVerdictSchema,
    mockKey,
    temperature: 0,
  });
  return { verdict: result.data, latencyMs: result.latencyMs, isMock: result.isMock };
}
