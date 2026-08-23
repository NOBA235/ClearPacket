import type { BenchmarkPacket } from "./types";
import type { RequirementManifest } from "../../lib/schemas";

/**
 * Builds the fixture dictionary MockGeminiClient needs to stand in for Node 1-3 on a given
 * packet. This is oracle data (see documents.ts/requirements-manifest.ts in each packet
 * folder) — it represents what a highly accurate Node 1-3 SHOULD extract, not what any
 * particular Gemini call actually returned. It exists so the deterministic engine (Node 4-5,
 * the real, unit-tested logic) and the mock end-to-end demo pipeline have consistent input.
 * See docs/evaluation.md for why this is not a substitute for real benchmark numbers.
 */
export function buildMockFixtures(packet: BenchmarkPacket, manifest: RequirementManifest): Record<string, unknown> {
  const fixtures: Record<string, unknown> = {
    [`node1:${packet.id}`]: manifest,
  };

  for (const doc of packet.documents) {
    fixtures[`node2:${doc.documentId}`] = {
      documentId: doc.documentId,
      documentType: doc.documentType,
      confidence: 0.97,
      alternativeClassifications: [],
      requiresHumanConfirmation: false,
    };
    fixtures[`node3:${doc.documentId}`] = {
      facts: packet.extractedFacts.filter((f) => f.documentId === doc.documentId),
    };
  }

  return fixtures;
}
