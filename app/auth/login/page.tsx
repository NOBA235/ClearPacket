"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "../../../components/SiteHeader";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/audit/new");
  }

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ maxWidth: 420, paddingTop: 64 }}>
        <h1 style={{ fontSize: 26 }}>Sign in</h1>
        <form onSubmit={handleSubmit} className="card" style={{ padding: 24, marginTop: 16 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)", marginBottom: 14 }}
          />
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)", marginBottom: 18 }}
          />
          {error && <p style={{ color: "var(--color-red)", fontSize: 13, marginBottom: 14 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 14 }}>
          No account? <Link href="/auth/signup">Create one</Link>
        </p>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 24 }}>
          Requires <code style={{ fontFamily: "var(--font-mono)" }}>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> configured — see{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>.env.example</code>. You can try the workflow itself
          without an account on the <Link href="/audit/new">audit page</Link>.
        </p>
      </main>
    </>
  );
}
