import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero — the thesis: a real finding, with its exact source, is the most characteristic
            thing in this product's world. Lead with one. */}
        <section className="container" style={{ paddingTop: 72, paddingBottom: 56 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }}>
            <div>
              <p style={{ color: "var(--color-primary-dark)", fontWeight: 600, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
                Pre-submission audit
              </p>
              <h1 style={{ fontSize: 42, maxWidth: 520 }}>Catch the mistake before the application does.</h1>
              <p style={{ fontSize: 17, color: "var(--color-text-muted)", maxWidth: 480, marginTop: 16 }}>
                ClearPacket reads the official scholarship notice, checks your documents against it line by line, and
                shows you exactly what&apos;s wrong — with the exact sentence it came from. No score. No guesses.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                <Link href="/audit/new" className="btn btn-primary">
                  Audit a packet
                </Link>
                <Link href="/benchmark" className="btn btn-secondary">
                  See the benchmark
                </Link>
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span className="badge badge-critical">Critical</span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  document validity
                </span>
              </div>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Expired document: income certificate</h3>
              <p style={{ fontSize: 14, marginBottom: 12 }}>
                This document&apos;s expiry date (31/01/2026) is before the audit date (15/03/2026).
              </p>
              <div className="citation severity-critical">
                <span className="citation-label">Exact source</span>
                &ldquo;The Income Certificate and Residence Certificate must not be expired as of the date of
                submission.&rdquo;
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 10 }}>
                Confidence 89% · rule engine · from a real run of this repository&apos;s benchmark suite
              </div>
            </div>
          </div>
        </section>

        {/* The problem */}
        <section style={{ background: "var(--color-bg-sunken)", padding: "56px 0" }}>
          <div className="container">
            <h2 style={{ fontSize: 26, maxWidth: 640 }}>Most rejections aren&apos;t about eligibility.</h2>
            <p style={{ fontSize: 15, color: "var(--color-text-muted)", maxWidth: 640, marginTop: 10 }}>
              A name that doesn&apos;t match across two documents. An income certificate for the wrong financial year.
              A missing signature. A transcript uploaded with a page missing. These are avoidable, mechanical
              mistakes — but they&apos;re easy to miss when you&apos;re cross-referencing a dense notice against half a
              dozen scanned PDFs alone, under deadline pressure, often for the first time.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="container" style={{ padding: "56px 0" }}>
          <h2 style={{ fontSize: 26, marginBottom: 24 }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { title: "Reads your notice", body: "Extracts only what the official notice explicitly requires — never generic scholarship knowledge." },
              { title: "Checks your packet", body: "Compares your documents against those requirements and against each other, citing exact evidence for every claim." },
              { title: "Verifies before showing you", body: "A second, independent pass double-checks every finding — nothing reaches your checklist without a citation." },
            ].map((step) => (
              <div key={step.title} className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What it checks / doesn't promise */}
        <section style={{ background: "var(--color-bg-sunken)", padding: "56px 0" }}>
          <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div>
              <h3 style={{ fontSize: 18 }}>What it checks</h3>
              <ul style={{ fontSize: 14, color: "var(--color-text-muted)", paddingLeft: 20, lineHeight: 1.9 }}>
                <li>Required documents present, in the right format and page count</li>
                <li>Names, dates of birth, and addresses consistent across documents</li>
                <li>Certificates valid and not expired as of your submission date</li>
                <li>Financial-year, GPA, and other stated numeric rules</li>
                <li>Signatures present where required</li>
                <li>Attempts to manipulate the audit via document text</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: 18 }}>What it doesn&apos;t promise</h3>
              <ul style={{ fontSize: 14, color: "var(--color-text-muted)", paddingLeft: 20, lineHeight: 1.9 }}>
                <li>No application score or approval percentage</li>
                <li>Never decides your legal eligibility</li>
                <li>Never edits, rewrites, or fabricates a document</li>
                <li>Never submits anything on your behalf</li>
                <li>Doesn&apos;t guarantee acceptance</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="container" style={{ padding: "56px 0" }}>
          <h2 style={{ fontSize: 22 }}>Your documents stay private</h2>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)", maxWidth: 640, marginTop: 8 }}>
            Documents are stored in a private bucket only you can access. Every table enforcing that is
            row-level-secured to your account. Nothing you upload is used to train any model. Full details in{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>docs/privacy-and-limitations.md</code>.
          </p>
        </section>

        <section style={{ padding: "64px 0 96px", textAlign: "center" }}>
          <Link href="/audit/new" className="btn btn-primary" style={{ fontSize: 16, padding: "14px 28px" }}>
            Audit a packet
          </Link>
        </section>
      </main>
    </>
  );
}
