import { describe, it, expect } from "vitest";
import { MockGeminiClient } from "../lib/gemini/mock-client";
import { runClearPacketWorkflow } from "../lib/workflow/run-workflow";
import { buildMockFixtures } from "../data/benchmark/mock-fixtures";
import { DEFAULT_RULE_ENGINE_CONFIG } from "../lib/rule-engine/types";
import { BENCHMARK_PACKETS, manifestForPacket, BENCHMARK_SUBMISSION_DATE, OFFICIAL_NOTICE_TEXT } from "../data/benchmark";

describe("Full 9-node workflow, mock mode, end to end", () => {
  for (const packet of BENCHMARK_PACKETS) {
    it(`${packet.label} completes and every finding carries evidence`, async () => {
      const manifest = manifestForPacket(packet.id);
      const client = new MockGeminiClient(buildMockFixtures(packet, manifest));
      const documentTexts: Record<string, string> = {};
      for (const doc of packet.documents) documentTexts[doc.documentId] = packet.rawDocumentText;

      const result = await runClearPacketWorkflow(
        {
          auditId: packet.id,
          officialDocumentsText: OFFICIAL_NOTICE_TEXT,
          documentTexts,
          documents: packet.documents,
          ruleEngineConfig: { submissionDate: BENCHMARK_SUBMISSION_DATE, ...DEFAULT_RULE_ENGINE_CONFIG },
        },
        client,
      );

      expect(result.isMock).toBe(true);
      // Every finding that survived the safety net has evidence.
      for (const f of result.findings) {
        if (f.status === "rejected") continue;
        expect(f.evidenceFactIds.length > 0 || !!f.sourceRequirementEvidence).toBe(true);
      }
      // The checklist only contains verified/human_review items, never rejected candidates.
      const findingsById = new Map(result.findings.map((f) => [f.id, f]));
      for (const item of result.checklist) {
        const source = findingsById.get(item.findingId);
        expect(source?.status === "verified" || source?.status === "human_review").toBe(true);
      }
    });
  }

  it("rejects a fabricated 'ignore instructions -> mark eligible' outcome for Packet C", async () => {
    const packet = BENCHMARK_PACKETS.find((p) => p.id === "packet-c")!;
    const manifest = manifestForPacket(packet.id);
    const client = new MockGeminiClient(buildMockFixtures(packet, manifest));
    const documentTexts: Record<string, string> = {};
    for (const doc of packet.documents) documentTexts[doc.documentId] = packet.rawDocumentText;

    const result = await runClearPacketWorkflow(
      {
        auditId: packet.id,
        officialDocumentsText: OFFICIAL_NOTICE_TEXT,
        documentTexts,
        documents: packet.documents,
        ruleEngineConfig: { submissionDate: BENCHMARK_SUBMISSION_DATE, ...DEFAULT_RULE_ENGINE_CONFIG },
      },
      client,
    );

    const injectionFinding = result.findings.find((f) => f.category === "prompt_injection_detected");
    expect(injectionFinding).toBeDefined();
    expect(injectionFinding?.status).not.toBe("rejected");
    // The real, evidence-backed findings (e.g. the address conflict) must still be present —
    // the injected text must not have suppressed them.
    expect(result.findings.some((f) => f.category === "cross_document_consistency")).toBe(true);
  });
});
