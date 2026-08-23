import { z } from "zod";
import { FindingSchema, type Finding, type RequirementManifest, type CanonicalFact } from "../schemas";
import { NODE6_SYSTEM_INSTRUCTION, NODE6_USER_TEMPLATE } from "../prompts/node6-adversarial-auditor";
import type { LlmClient } from "../gemini/types";

const CandidateListSchema = z.object({ candidates: z.array(FindingSchema) });

export async function runNode6AdversarialAuditor(
  client: LlmClient,
  manifest: RequirementManifest,
  canonicalFacts: CanonicalFact[],
  deterministicFindings: Finding[],
  mockKey: string,
): Promise<{ candidates: Finding[]; latencyMs: number; isMock: boolean }> {
  const result = await client.generateStructured({
    systemInstruction: NODE6_SYSTEM_INSTRUCTION,
    userContent: NODE6_USER_TEMPLATE(
      JSON.stringify(manifest.requirements),
      JSON.stringify(canonicalFacts),
      JSON.stringify(deterministicFindings),
    ),
    schema: CandidateListSchema,
    mockKey,
    temperature: 0.4, // slightly higher — this pass is explicitly meant to probe, not just confirm
  });
  return { candidates: result.data.candidates, latencyMs: result.latencyMs, isMock: result.isMock };
}
