"use client";

import { useState } from "react";
import { SiteHeader } from "../../../components/SiteHeader";
import { FindingCard } from "../../../components/FindingCard";
import type { Finding, ChecklistItem } from "../../../lib/schemas";

const STEPS = [
  "Upload official requirements",
  "Upload application",
  "Upload supporting documents",
  "Confirm document classifications",
  "Run audit",
  "Answer necessary clarification questions",
  "Review results",
];

const DEMO_PACKETS = [
  { id: "packet-a", label: "Packet A — Clean", blurb: "All documents agree. Should come back clean." },
  { id: "packet-b", label: "Packet B — 10 defects", blurb: "Ten planted administrative errors." },
  { id: "packet-c", label: "Packet C — Adversarial", blurb: "Ambiguous scans, a confirmed conditional requirement, an embedded prompt-injection attempt." },
  { id: "demo-aren-jamir", label: "Demo — Aren Jamir", blurb: "The product's own onboarding seed: 5 planted problems, 1 ambiguous value, 1 injection attempt." },
];

interface DemoResult {
  packetId: string;
  packetLabel: string;
  isMock: boolean;
  findings: Finding[];
  checklist: ChecklistItem[];
  clarificationQuestions: { id: string; question: string }[];
  documentCount: number;
}

export default function NewAuditPage() {
  const [loadingPacket, setLoadingPacket] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDemo(packetId: string) {
    setLoadingPacket(packetId);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/demo-audit?packet=${packetId}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as DemoResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong running the demo audit.");
    } finally {
      setLoadingPacket(null);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <h1 style={{ fontSize: 30 }}>Audit a packet</h1>
        <p style={{ fontSize: 15, color: "var(--color-text-muted)", maxWidth: 640 }}>
          The full flow uploads your own official notice and documents to your private, RLS-protected storage.
          That requires a configured Supabase project (see <code style={{ fontFamily: "var(--font-mono)" }}>docs/privacy-and-limitations.md</code>).
          Below, try the real 9-node workflow right now against one of this repository&apos;s seeded benchmark
          packets — no account needed.
        </p>

        <ol style={{ fontSize: 14, color: "var(--color-text-muted)", paddingLeft: 20, marginTop: 20, lineHeight: 1.9 }}>
          {STEPS.map((step, i) => (
            <li key={step}>
              {step}
              {i === 4 && <span style={{ color: "var(--color-primary)" }}> — this is what the demo below runs</span>}
            </li>
          ))}
        </ol>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18 }}>Try it now</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 12 }}>
            {DEMO_PACKETS.map((p) => (
              <div key={p.id} className="card" style={{ padding: 18 }}>
                <h3 style={{ fontSize: 15 }}>{p.label}</h3>
                <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{p.blurb}</p>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: 8 }}
                  disabled={loadingPacket !== null}
                  onClick={() => runDemo(p.id)}
                >
                  {loadingPacket === p.id ? "Running the workflow…" : "Run audit"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="card" style={{ padding: 16, marginTop: 24, borderColor: "var(--color-red-border)", background: "var(--color-red-soft)" }}>
            <p style={{ fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        {result && (
          <section style={{ marginTop: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>Results — {result.packetLabel}</h2>
              {result.isMock && <span className="badge badge-mock">MOCK RUN</span>}
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {result.documentCount} documents audited · {result.findings.length} findings ·{" "}
              {result.clarificationQuestions.length} question{result.clarificationQuestions.length === 1 ? "" : "s"} for you
              {result.isMock && (
                <>
                  {" "}
                  · this used <code style={{ fontFamily: "var(--font-mono)" }}>MockGeminiClient</code>, not a real Gemini
                  call — see <code style={{ fontFamily: "var(--font-mono)" }}>docs/evaluation.md</code>
                </>
              )}
            </p>

            {result.clarificationQuestions.length > 0 && (
              <div className="card" style={{ padding: 16, marginTop: 12, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Before you submit, please confirm:</h3>
                {result.clarificationQuestions.map((q) => (
                  <p key={q.id} style={{ fontSize: 14, marginBottom: 6 }}>
                    · {q.question}
                  </p>
                ))}
              </div>
            )}

            {result.findings.filter((f) => f.status !== "rejected").length === 0 ? (
              <div className="card" style={{ padding: 18 }}>
                <span className="badge badge-passed">Passed</span>
                <p style={{ fontSize: 14, marginTop: 8, marginBottom: 0 }}>No issues found against the stated requirements.</p>
              </div>
            ) : (
              result.findings.filter((f) => f.status !== "rejected").map((f) => <FindingCard key={f.id} finding={f} />)
            )}
          </section>
        )}
      </main>
    </>
  );
}
