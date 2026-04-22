"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace("/chat");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const sb = createClient();
    const { data, error } = await sb.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          username: form.name.toLowerCase().replace(/\s+/g, "_"),
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data?.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists.");
      setLoading(false);
      return;
    }
    if (!data.session) {
      setDone(true);
      setLoading(false);
      return;
    }
    router.replace("/chat");
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: "var(--accent)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageCircle size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Strata Signal</div>
            <div style={{ fontSize: 11.5, color: "var(--text3)" }}>Campus messaging</div>
          </div>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📧</div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Check your email</h2>
            <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, marginBottom: 24 }}>
              We sent a confirmation link to <strong style={{ color: "var(--text)" }}>{form.email}</strong>. Click it to activate your account.
            </p>
            <button className="ss-btn-ghost" onClick={() => { setDone(false); setTab("login"); setError(""); }}>
              Back to login
            </button>
          </div>
        ) : (
          <>
            <div className="tab-row">
              <button className={`tab-btn ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>Log in</button>
              <button className={`tab-btn ${tab === "signup" ? "active" : ""}`} onClick={() => { setTab("signup"); setError(""); }}>Create account</button>
            </div>

            {error && <div className="ss-error">{error}</div>}

            {tab === "login" ? (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="label">Email</label>
                  <input className="ss-input" type="email" placeholder="you@campus.ac.bw" value={form.email} onChange={set("email")} required autoComplete="email" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="ss-input"
                      type={showPw ? "text" : "password"}
                      placeholder="Your password"
                      value={form.password}
                      onChange={set("password")}
                      style={{ paddingRight: 44 }}
                      required
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", display: "flex" }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="ss-btn" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? "Logging in…" : "Log in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="label">Full Name</label>
                  <input className="ss-input" type="text" placeholder="Keabetswe Molefe" value={form.name} onChange={set("name")} required />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="ss-input" type="email" placeholder="you@campus.ac.bw" value={form.email} onChange={set("email")} required autoComplete="email" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="ss-input"
                      type={showPw ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={set("password")}
                      style={{ paddingRight: 44 }}
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", display: "flex" }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="ss-btn" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
