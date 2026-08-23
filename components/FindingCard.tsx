import type { Finding } from "../lib/schemas";

const SEVERITY_LABEL: Record<Finding["severity"], string> = {
  critical: "Critical",
  warning: "Warning",
  review: "Needs your input",
  passed: "Passed",
};

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className="card" style={{ padding: 18, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <span className={`badge badge-${finding.severity}`}>{SEVERITY_LABEL[finding.severity]}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {finding.category.replace(/_/g, " ")}
        </span>
        {finding.status === "human_review" && (
          <span style={{ fontSize: 12, color: "var(--color-primary)" }}>· awaiting your confirmation</span>
        )}
      </div>
      <h3 style={{ fontSize: 16, marginBottom: 6 }}>{finding.title}</h3>
      <p style={{ fontSize: 14, color: "var(--color-text)", marginBottom: 12 }}>{finding.explanation}</p>
      {finding.sourceRequirementEvidence && (
        <div className={`citation severity-${finding.severity}`} style={{ marginBottom: finding.evidenceFactIds.length ? 8 : 0 }}>
          <span className="citation-label">Exact source</span>
          &ldquo;{finding.sourceRequirementEvidence}&rdquo;
        </div>
      )}
      {finding.evidenceFactIds.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          Evidence: {finding.evidenceFactIds.join(", ")}
          {finding.affectedDocuments.length > 0 && <> · Documents: {finding.affectedDocuments.join(", ")}</>}
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
        Confidence {(finding.confidence * 100).toFixed(0)}% · {finding.origin === "adversarial" ? "found by adversarial pass" : "rule engine"}
      </div>
    </div>
  );
}
