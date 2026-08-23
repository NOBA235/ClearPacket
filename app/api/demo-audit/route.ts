import { NextRequest, NextResponse } from "next/server";
import { GeminiClient } from "../../../lib/gemini/client";
import { MockGeminiClient } from "../../../lib/gemini/mock-client";
import { runClearPacketWorkflow } from "../../../lib/workflow/run-workflow";
import { buildMockFixtures } from "../../../data/benchmark/mock-fixtures";
import { DEFAULT_RULE_ENGINE_CONFIG } from "../../../lib/rule-engine/types";
import { BENCHMARK_PACKETS, manifestForPacket, BENCHMARK_SUBMISSION_DATE, OFFICIAL_NOTICE_TEXT } from "../../../data/benchmark";
import { demoArenJamir } from "../../../data/demo/aren-jamir";
import { buildDemoArenJamirManifest } from "../../../data/demo/requirements-manifest";
import type { BenchmarkPacket } from "../../../data/benchmark/types";
import type { RequirementManifest } from "../../../lib/schemas";

/**
 * Demo-only endpoint: runs the real 9-node workflow (lib/workflow/run-workflow.ts) against one
 * of the three benchmark packets, or the product's own "Aren Jamir" onboarding seed data
 * (data/demo/aren-jamir.ts — kept separate from BENCHMARK_PACKETS so it never shows up in the
 * evaluation harness/summary, which is scored against the 3 benchmark packets only). Deliberately
 * does not touch Supabase — it exists so anyone can see the real pipeline produce real (or,
 * without GEMINI_API_KEY, clearly-labeled mock) output without first standing up a database. The
 * full upload -> classify -> confirm -> audit flow described in the product spec, backed by real
 * user documents and Supabase Storage, is the /audit/new step flow — this route is its
 * "try it now" shortcut.
 */
export async function GET(req: NextRequest) {
  const packetId = req.nextUrl.searchParams.get("packet") ?? "packet-b";

  let packet: BenchmarkPacket | undefined;
  let manifest: RequirementManifest;

  if (packetId === "demo-aren-jamir") {
    packet = demoArenJamir;
    manifest = buildDemoArenJamirManifest();
  } else {
    packet = BENCHMARK_PACKETS.find((p) => p.id === packetId);
    if (!packet) {
      return NextResponse.json({ error: `Unknown packet "${packetId}"` }, { status: 400 });
    }
    manifest = manifestForPacket(packet.id);
  }

  const client = process.env.GEMINI_API_KEY
    ? new GeminiClient(process.env.GEMINI_API_KEY)
    : new MockGeminiClient(buildMockFixtures(packet, manifest));

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

  return NextResponse.json({
    packetId: packet.id,
    packetLabel: packet.label,
    isMock: result.isMock,
    findings: result.findings,
    checklist: result.checklist,
    clarificationQuestions: result.clarificationQuestions,
    documentCount: packet.documents.length,
  });
}
