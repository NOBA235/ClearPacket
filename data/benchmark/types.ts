import type { ExtractedFact } from "../../lib/schemas";
import type { DocumentMeta } from "../../lib/rule-engine/types";
import type { GroundTruthDefect } from "../../eval/metrics";

export const BENCHMARK_SUBMISSION_DATE = "2026-03-15";

export interface BenchmarkPacket {
  id: "packet-a" | "packet-b" | "packet-c" | "demo-aren-jamir";
  label: string;
  purpose: string;
  documents: DocumentMeta[];
  /** Oracle extraction — the mock client's Node-3 fixture, and the direct input for engine-level tests. */
  extractedFacts: ExtractedFact[];
  /** Raw concatenated document text a real Node 1-3 pipeline would be given. */
  rawDocumentText: string;
  groundTruth: GroundTruthDefect[];
}
