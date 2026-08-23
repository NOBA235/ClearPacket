"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../../../components/SiteHeader";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ maxWidth: 420, paddingTop: 64 }}>
        <h1 style={{ fontSize: 26 }}>Create an account</h1>
        {done ? (
          <div className="card" style={{ padding: 24, marginTop: 16 }}>
            <p style={{ fontSize: 14 }}>Check your email to confirm your account, then sign in.</p>
            <Link href="/auth/login" className="btn btn-primary" style={{ marginTop: 8 }}>
              Go to sign in
            </Link>
          </div>
        ) : (
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)", marginBottom: 18 }}
            />
            {error && <p style={{ color: "var(--color-red)", fontSize: 13, marginBottom: 14 }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 14 }}>
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </p>
      </main>
    </>
  );
}
