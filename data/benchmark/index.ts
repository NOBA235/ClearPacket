import { packetA } from "./packet-a/documents";
import { packetB } from "./packet-b/documents";
import { packetC } from "./packet-c/documents";
import { buildOracleRequirementsManifest } from "./requirements-manifest";
import { buildPacketCManifest } from "./packet-c/requirements-manifest";
import type { BenchmarkPacket } from "./types";
import type { RequirementManifest } from "../../lib/schemas";

export { OFFICIAL_NOTICE_TEXT } from "./official-notice";
export { BENCHMARK_SUBMISSION_DATE } from "./types";
export * from "./types";

export const BENCHMARK_PACKETS: BenchmarkPacket[] = [packetA, packetB, packetC];

export function manifestForPacket(packetId: BenchmarkPacket["id"]): RequirementManifest {
  if (packetId === "packet-c") return buildPacketCManifest();
  return buildOracleRequirementsManifest(packetId);
}
