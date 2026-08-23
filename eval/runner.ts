import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { GeminiClient } from "../lib/gemini/client";
import { MockGeminiClient } from "../lib/gemini/mock-client";
import type { LlmClient } from "../lib/gemini/types";
import { BENCHMARK_PACKETS, manifestForPacket, BENCHMARK_SUBMISSION_DATE, OFFICIAL_NOTICE_TEXT } from "../data/benchmark";
import { buildMockFixtures } from "../data/benchmark/mock-fixtures";
import { runClearPacketWorkflow } from "../lib/workflow/run-workflow";
import { runBaseline } from "./baseline-runner";
import { baselineFindingsToFindings, baselineEvidenceCoverage } from "./categorize-baseline";
import {
  matchFindingsToGroundTruth,
  computeScores,
  evidenceCoverage,
  hallucinationRate,
  computeRepeatability,
  scorePromptInjectionResistance,
} from "./metrics";
import { DEFAULT_RULE_ENGINE_CONFIG } from "../lib/rule-engine/types";
import baselineAJson from "../data/benchmark/packet-a/baseline-mock-response.json";
import baselineBJson from "../data/benchmark/packet-b/baseline-mock-response.json";
import baselineCJson from "../data/benchmark/packet-c/baseline-mock-response.json";

const RUNS_PER_PACKET = 3;
const OUT_DIR = join(process.cwd(), "eval", "results");

const BASELINE_FIXTURES: Record<string, unknown> = {
  "baseline:packet-a": baselineAJson,
  "baseline:packet-b": baselineBJson,
  "baseline:packet-c": baselineCJson,
};

function buildClient(): { client: LlmClient; isMock: boolean } {
  if (process.env.GEMINI_API_KEY) {
    return { client: new GeminiClient(process.env.GEMINI_API_KEY), isMock: false };
  }
  console.warn(
    "\n⚠️  GEMINI_API_KEY is not set — running with MockGeminiClient. These are NOT real model results.\n" +
      "   Set GEMINI_API_KEY (see .env.example) and re-run for real benchmark numbers.\n",
  );
  const fixtures: Record<string, unknown> = { ...BASELINE_FIXTURES };
  for (const packet of BENCHMARK_PACKETS) {
    Object.assign(fixtures, buildMockFixtures(packet, manifestForPacket(packet.id)));
  }
  return { client: new MockGeminiClient(fixtures), isMock: true };
}

async function main() {
  const approach = (process.argv.find((a) => a.startsWith("--approach="))?.split("=")[1] ?? "all") as
    | "baseline"
    | "clearpacket"
    | "all";
  const { client, isMock } = buildClient();
  mkdirSync(OUT_DIR, { recursive: true });

  const summary: Record<string, unknown> = { generatedAt: new Date().toISOString(), isMock, runsPerPacket: RUNS_PER_PACKET, packets: {} };

  for (const packet of BENCHMARK_PACKETS) {
    console.log(`\n=== ${packet.label} ===`);
    const packetSummary: Record<string, unknown> = {};

    if (approach === "baseline" || approach === "all") {
      const runs = [];
      for (let i = 0; i < RUNS_PER_PACKET; i++) runs.push(await runBaseline(client, packet));
      writeFileSync(join(OUT_DIR, `${packet.id}-baseline-raw.json`), JSON.stringify(runs, null, 2));

      const scoredRuns = runs.map((r) => {
        const asFindings = baselineFindingsToFindings(r.findings);
        const match = matchFindingsToGroundTruth(asFindings, packet.groundTruth);
        return { scores: computeScores(match), evidenceCoverage: baselineEvidenceCoverage(r.findings), categories: asFindings.map((f) => f.category), latencyMs: r.latencyMs, usage: r.usage };
      });
      const repeatability = computeRepeatability(scoredRuns.map((r) => r.categories));
      const last = scoredRuns[scoredRuns.length - 1]!;
      packetSummary.baseline = {
        isMock,
        precision: last.scores.precision,
        recall: last.scores.recall,
        f1: last.scores.f1,
        falsePositives: last.scores.falsePositives,
        falseNegatives: last.scores.falseNegatives,
        evidenceCoverage: last.evidenceCoverage,
        hallucinationRate: 1 - last.evidenceCoverage,
        repeatability: repeatability.agreementRate,
        avgLatencyMs: avg(scoredRuns.map((r) => r.latencyMs)),
        avgTokens: avg(scoredRuns.map((r) => (r.usage?.inputTokens ?? 0) + (r.usage?.outputTokens ?? 0))),
      };
      console.log("Baseline:", packetSummary.baseline);
    }

    if (approach === "clearpacket" || approach === "all") {
      const manifest = manifestForPacket(packet.id);
      const documentTexts: Record<string, string> = {};
      for (const doc of packet.documents) documentTexts[doc.documentId] = packet.rawDocumentText; // per-doc slicing is a real-pipeline concern; the mock path uses fixtures directly regardless.

      const runs = [];
      for (let i = 0; i < RUNS_PER_PACKET; i++) {
        runs.push(
          await runClearPacketWorkflow(
            {
              auditId: packet.id,
              officialDocumentsText: OFFICIAL_NOTICE_TEXT,
              documentTexts,
              documents: packet.documents,
              ruleEngineConfig: { submissionDate: BENCHMARK_SUBMISSION_DATE, ...DEFAULT_RULE_ENGINE_CONFIG },
            },
            client,
          ),
        );
      }
      writeFileSync(
        join(OUT_DIR, `${packet.id}-clearpacket-raw.json`),
        JSON.stringify(runs.map((r) => ({ findings: r.findings, checklist: r.checklist, timings: r.timings, isMock: r.isMock })), null, 2),
      );

      const scoredRuns = runs.map((r) => {
        const match = matchFindingsToGroundTruth(r.findings, packet.groundTruth);
        return {
          scores: computeScores(match),
          evidenceCoverage: evidenceCoverage(r.findings),
          hallucinationRate: hallucinationRate(r.findings),
          promptInjection: scorePromptInjectionResistance(r.findings),
          categories: r.findings.filter((f) => f.severity !== "passed").map((f) => f.category),
          latencyMs: r.timings.reduce((s, t) => s + t.latencyMs, 0),
        };
      });
      const repeatability = computeRepeatability(scoredRuns.map((r) => r.categories));
      const last = scoredRuns[scoredRuns.length - 1]!;
      packetSummary.clearpacket = {
        isMock,
        precision: last.scores.precision,
        recall: last.scores.recall,
        f1: last.scores.f1,
        falsePositives: last.scores.falsePositives,
        falseNegatives: last.scores.falseNegatives,
        evidenceCoverage: last.evidenceCoverage,
        hallucinationRate: last.hallucinationRate,
        promptInjectionDetected: last.promptInjection.wasDetected,
        promptInjectionManipulated: last.promptInjection.wasManipulated,
        repeatability: repeatability.agreementRate,
        avgLatencyMs: avg(scoredRuns.map((r) => r.latencyMs)),
      };
      console.log("ClearPacket:", packetSummary.clearpacket);
    }

    (summary.packets as Record<string, unknown>)[packet.id] = packetSummary;
  }

  writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nRaw outputs and summary.json written to ${OUT_DIR}`);
  if (isMock) {
    console.log("\n⚠️  Reminder: the numbers above came from MockGeminiClient fixtures, not a real model. See docs/evaluation.md.");
  }
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
