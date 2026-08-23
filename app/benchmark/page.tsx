import fs from "node:fs";
import path from "node:path";
import { SiteHeader } from "../../components/SiteHeader";
import { BENCHMARK_PACKETS } from "../../data/benchmark";

interface PacketSummary {
  baseline?: Record<string, number | boolean>;
  clearpacket?: Record<string, number | boolean>;
}
interface Summary {
  generatedAt: string;
  isMock: boolean;
  runsPerPacket: number;
  packets: Record<string, PacketSummary>;
}

function loadSummary(): Summary | null {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "eval", "results", "summary.json"), "utf-8");
    return JSON.parse(raw) as Summary;
  } catch {
    return null;
  }
}

function fmtPct(v: number | boolean | undefined): string {
  if (typeof v !== "number") return "—";
  return `${(v * 100).toFixed(0)}%`;
}
function fmtNum(v: number | boolean | undefined): string {
  if (typeof v !== "number") return "—";
  return v.toFixed(2);
}

export default function BenchmarkPage() {
  const summary = loadSummary();

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <h1 style={{ fontSize: 32 }}>Benchmark lab</h1>
        <p style={{ fontSize: 15, color: "var(--color-text-muted)", maxWidth: 680 }}>
          The core claim of this project — a structured, multi-node workflow beats a single mega-prompt on the same
          documents — has to be measured, not asserted. This page shows the actual output of{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>npm run eval:all</code>.
        </p>

        {summary?.isMock && (
          <div className="card" style={{ padding: 16, marginTop: 20, borderColor: "var(--color-amber-border)", background: "var(--color-amber-soft)" }}>
            <span className="badge badge-mock">MOCK RESULTS</span>
            <p style={{ fontSize: 14, marginTop: 10, marginBottom: 0 }}>
              These numbers came from <code style={{ fontFamily: "var(--font-mono)" }}>MockGeminiClient</code> fixtures,
              not a real Gemini call — the environment that generated them had no <code style={{ fontFamily: "var(--font-mono)" }}>GEMINI_API_KEY</code>{" "}
              configured. They prove the evaluation harness, scoring math, and 9-node pipeline work correctly
              end-to-end. They are <strong>not</strong> evidence of real model accuracy. Set{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>GEMINI_API_KEY</code> and re-run for real numbers. Full
              explanation: <code style={{ fontFamily: "var(--font-mono)" }}>docs/evaluation.md</code>.
            </p>
          </div>
        )}

        {!summary && (
          <div className="card" style={{ padding: 20, marginTop: 24 }}>
            <p style={{ fontSize: 14 }}>
              No results found yet. Run <code style={{ fontFamily: "var(--font-mono)" }}>npm run eval:all</code> to
              generate <code style={{ fontFamily: "var(--font-mono)" }}>eval/results/summary.json</code>, then reload
              this page.
            </p>
          </div>
        )}

        {summary && (
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
            Generated {new Date(summary.generatedAt).toLocaleString()} · {summary.runsPerPacket} runs per packet/approach
          </p>
        )}

        {summary &&
          BENCHMARK_PACKETS.map((packet) => {
            const ps = summary.packets[packet.id];
            if (!ps) return null;
            return (
              <section key={packet.id} style={{ marginTop: 40 }}>
                <h2 style={{ fontSize: 20 }}>{packet.label}</h2>
                <p style={{ fontSize: 14, color: "var(--color-text-muted)", maxWidth: 680 }}>{packet.purpose}</p>
                <div style={{ overflowX: "auto", marginTop: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                        <th style={{ padding: "8px 10px" }}>Approach</th>
                        <th style={{ padding: "8px 10px" }}>Precision</th>
                        <th style={{ padding: "8px 10px" }}>Recall</th>
                        <th style={{ padding: "8px 10px" }}>F1</th>
                        <th style={{ padding: "8px 10px" }}>Evidence coverage</th>
                        <th style={{ padding: "8px 10px" }}>Hallucination rate</th>
                        <th style={{ padding: "8px 10px" }}>False positives</th>
                        <th style={{ padding: "8px 10px" }}>False negatives</th>
                        <th style={{ padding: "8px 10px" }}>Repeatability</th>
                        <th style={{ padding: "8px 10px" }}>Avg latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(["baseline", "clearpacket"] as const).map((approach) => {
                        const row = ps[approach];
                        if (!row) return null;
                        return (
                          <tr key={approach} style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "8px 10px", fontWeight: 600, textTransform: "capitalize" }}>
                              {approach === "clearpacket" ? "ClearPacket" : "Baseline"}
                            </td>
                            <td style={{ padding: "8px 10px" }}>{fmtNum(row.precision)}</td>
                            <td style={{ padding: "8px 10px" }}>{fmtNum(row.recall)}</td>
                            <td style={{ padding: "8px 10px" }}>{fmtNum(row.f1)}</td>
                            <td style={{ padding: "8px 10px" }}>{fmtPct(row.evidenceCoverage)}</td>
                            <td style={{ padding: "8px 10px" }}>{fmtPct(row.hallucinationRate)}</td>
                            <td style={{ padding: "8px 10px" }}>{row.falsePositives ?? "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{row.falseNegatives ?? "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{fmtPct(row.repeatability)}</td>
                            <td style={{ padding: "8px 10px" }}>
                              {typeof row.avgLatencyMs === "number" ? `${row.avgLatencyMs.toFixed(0)} ms` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {ps.clearpacket && "promptInjectionDetected" in ps.clearpacket && (
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 10 }}>
                    Prompt-injection test — ClearPacket: detected {ps.clearpacket.promptInjectionDetected ? "✓" : "✗"}, manipulated{" "}
                    {ps.clearpacket.promptInjectionManipulated ? "✗ (failed)" : "✓ (resisted)"}
                    {ps.baseline && " · Baseline: not designed to detect this, scored separately in docs/evaluation.md"}
                  </p>
                )}
              </section>
            );
          })}

        <section style={{ marginTop: 48 }} className="card">
          <div style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16 }}>Reproduce this</h3>
            <pre style={{ fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--color-bg-sunken)", padding: 14, borderRadius: 8, overflowX: "auto" }}>
{`# Mock mode (no key needed — proves the harness works)
npm run eval:all

# Real mode
echo "GEMINI_API_KEY=your-key" >> .env.local
npm run eval:all`}
            </pre>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              Raw per-run output is written to <code style={{ fontFamily: "var(--font-mono)" }}>eval/results/*.json</code> for
              auditing. Full methodology, scoring caveats, and the bugs this benchmark process caught during
              development: <code style={{ fontFamily: "var(--font-mono)" }}>docs/evaluation.md</code>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
