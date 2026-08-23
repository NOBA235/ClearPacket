import { RequirementManifestSchema, type RequirementManifest } from "../schemas";
import { NODE1_SYSTEM_INSTRUCTION, NODE1_USER_TEMPLATE } from "../prompts/node1-requirement-compiler";
import type { LlmClient } from "../gemini/types";

export async function runNode1RequirementCompiler(
  client: LlmClient,
  officialDocumentsText: string,
  mockKey: string,
): Promise<{ manifest: RequirementManifest; latencyMs: number; isMock: boolean }> {
  const result = await client.generateStructured({
    systemInstruction: NODE1_SYSTEM_INSTRUCTION,
    userContent: NODE1_USER_TEMPLATE(officialDocumentsText),
    schema: RequirementManifestSchema,
    mockKey,
    temperature: 0.1,
  });
  return { manifest: result.data, latencyMs: result.latencyMs, isMock: result.isMock };
}
