import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ overflow: "hidden" }}>
        <section style={{ background: "var(--color-bg-raised)", borderBottom: "1px solid var(--color-border)" }}>
          <div className="container" style={{ paddingTop: 88, paddingBottom: 78 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 48, alignItems: "center" }}>
            <div>
              <p style={{ color: "var(--color-primary-dark)", fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>
                Pre-submission audit / built for high-stakes paperwork
              </p>
              <h1 style={{ fontSize: "clamp(42px, 5.5vw, 68px)", maxWidth: 650, letterSpacing: "-0.035em", lineHeight: 1.04 }}>
                Your application deserves a second pair of eyes.
              </h1>
              <p style={{ fontSize: 18, color: "var(--color-text-muted)", maxWidth: 560, marginTop: 22, lineHeight: 1.6 }}>
                ClearPacket reads the official scholarship notice, checks your documents against it line by line, and shows you exactly what&apos;s wrong, with the exact sentence it came from.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
                <Link href="/audit/new" className="btn btn-primary" style={{ padding: "13px 22px" }}>
                  Audit a packet <span aria-hidden="true">-&gt;</span>
                </Link>
                <Link href="/benchmark" className="btn btn-secondary" style={{ padding: "13px 22px" }}>
                  See the benchmark
                </Link>
              </div>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 15 }}>No score. No guesses. No submission on your behalf.</p>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: "-24px -34px auto auto", width: 150, height: 150, border: "1px solid var(--color-border)", borderRadius: "50%" }} aria-hidden="true" />
              <div className="card" style={{ padding: 24, position: "relative", borderTop: "3px solid var(--color-red-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)" }}>FINDING / 001</span>
                  <span className="badge badge-critical">Critical</span>
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Document validity</p>
                <h2 style={{ fontSize: 21, marginBottom: 8 }}>Expired document: income certificate</h2>
                <p style={{ fontSize: 14, marginBottom: 18 }}>Expiry date <strong>31/01/2026</strong> is before the audit date <strong>15/03/2026</strong>.</p>
              <div className="citation severity-critical">
                <span className="citation-label">Exact source</span>
                &ldquo;The Income Certificate and Residence Certificate must not be expired as of the date of submission.&rdquo;
              </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginTop: 18, fontFamily: "var(--font-mono)" }}>
                  <span>CONFIDENCE 89%</span><span>RULE ENGINE</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </section>

        <section className="container" style={{ padding: "22px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "center", color: "var(--color-text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--color-text)" }}>BUILT AROUND EVIDENCE</span>
            <span>01 / OFFICIAL NOTICE</span><span>02 / DOCUMENT PACKET</span><span>03 / VERIFIED FINDINGS</span>
          </div>
        </section>

        {/* The problem */}
        <section style={{ background: "var(--color-bg-sunken)", padding: "72px 0" }}>
          <div className="container">
            <p style={{ color: "var(--color-primary-dark)", fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>The expensive part is usually mechanical</p>
            <h2 style={{ fontSize: 34, maxWidth: 680 }}>Most rejections aren&apos;t about eligibility.</h2>
            <p style={{ fontSize: 16, color: "var(--color-text-muted)", maxWidth: 680, marginTop: 14 }}>
              A name that doesn&apos;t match across two documents. An income certificate for the wrong financial year.
              A missing signature. A transcript uploaded with a page missing. These are avoidable, mechanical
              mistakes — but they&apos;re easy to miss when you&apos;re cross-referencing a dense notice against half a
              dozen scanned PDFs alone, under deadline pressure, often for the first time.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="container" style={{ padding: "76px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "end", marginBottom: 28, flexWrap: "wrap" }}>
            <div><p style={{ color: "var(--color-primary-dark)", fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>The workflow</p><h2 style={{ fontSize: 34 }}>Three passes. One clear answer.</h2></div>
            <p style={{ color: "var(--color-text-muted)", fontSize: 14, maxWidth: 300, margin: 0 }}>Every finding must be traceable to the notice or a document in your packet.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
            {[
              { title: "Reads your notice", body: "Extracts only what the official notice explicitly requires — never generic scholarship knowledge." },
              { title: "Checks your packet", body: "Compares your documents against those requirements and against each other, citing exact evidence for every claim." },
              { title: "Verifies before showing you", body: "A second, independent pass double-checks every finding — nothing reaches your checklist without a citation." },
            ].map((step) => (
              <div key={step.title} className="card" style={{ padding: 22, borderTop: "2px solid var(--color-primary)" }}>
                <p style={{ color: "var(--color-primary-dark)", fontFamily: "var(--font-mono)", fontSize: 12, margin: "0 0 24px" }}>0{["Reads your notice", "Checks your packet", "Verifies before showing you"].indexOf(step.title) + 1}</p>
                <h3 style={{ fontSize: 18 }}>{step.title}</h3>
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
