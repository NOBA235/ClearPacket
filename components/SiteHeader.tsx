import Link from "next/link";

export function SiteHeader() {
  return (
    <header style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-raised)" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, color: "var(--color-text)", textDecoration: "none" }}>
          ClearPacket
        </Link>
        <nav style={{ display: "flex", gap: 24, alignItems: "center", fontSize: 14 }}>
          <Link href="/benchmark" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>
            Benchmark lab
          </Link>
          <Link href="/audit/new" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>
            Audit a packet
          </Link>
          <Link href="/auth/login" className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }}>
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
