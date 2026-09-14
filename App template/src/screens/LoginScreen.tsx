import { useState } from "react";
import type { Screen } from "../App";

const s = {
  root: { height: "100%", background: "#fff", display: "flex", flexDirection: "column" as const, overflowY: "auto" as const },
  hero: {
    background: "#F4FAF5",
    padding: "44px 32px 36px",
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 16,
  },
  logoWrap: {
    width: 72, height: 72, borderRadius: 24,
    background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 20px rgba(76,163,102,0.18)",
    fontSize: 36,
  },
  appName: { fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 26, color: "#111", letterSpacing: -0.5 },
  tagline: { fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 14, color: "#888", marginTop: -6 },
  body: { flex: 1, padding: "28px 24px 32px", display: "flex", flexDirection: "column" as const, gap: 14 },
  tab: {
    display: "flex", background: "#F5F5F5", borderRadius: 16, padding: 4, gap: 4,
  },
  tabBtn: (active: boolean) => ({
    flex: 1, height: 38, borderRadius: 12, border: "none", cursor: "pointer",
    fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14,
    background: active ? "#fff" : "transparent",
    color: active ? "#111" : "#999",
    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.07)" : "none",
    transition: "all .18s",
  }),
  inputWrap: (focused: boolean) => ({
    display: "flex", alignItems: "center", gap: 10,
    background: "#F8F8F8", borderRadius: 16, padding: "0 16px",
    height: 52,
    border: `1.5px solid ${focused ? "#4CA366" : "transparent"}`,
    transition: "border-color .18s",
  }),
  input: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#111",
  },
  primaryBtn: {
    height: 54, borderRadius: 18, border: "none", cursor: "pointer",
    background: "#3D9A58", color: "#fff",
    fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 16,
    letterSpacing: 0.2,
    boxShadow: "0 6px 24px rgba(61,154,88,0.28)",
    transition: "transform .12s, box-shadow .12s",
  },
  dividerRow: { display: "flex", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, background: "#F0F0F0" },
  dividerText: { fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#bbb" },
  socialRow: { display: "flex", gap: 10 },
  socialBtn: (dark?: boolean) => ({
    flex: 1, height: 50, borderRadius: 16, border: "1.5px solid #EDEDED", cursor: "pointer",
    background: dark ? "#111" : "#fff",
    color: dark ? "#fff" : "#111",
    fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "transform .12s",
  }),
  usernameBtn: {
    height: 50, borderRadius: 16, border: "1.5px solid #EDEDED", cursor: "pointer",
    background: "#fff",
    fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#555",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  },
};

export default function LoginScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [focused, setFocused] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div style={s.root}>
      <div style={s.hero}>
        <div style={s.logoWrap}>🥦</div>
        <div style={{ textAlign: "center" }}>
          <div style={s.appName}>Mealventory</div>
          <div style={s.tagline}>Track your food, waste less.</div>
        </div>
      </div>

      <div style={s.body}>
        {/* Toggle */}
        <div style={s.tab}>
          <button style={s.tabBtn(mode === "login")} onClick={() => setMode("login")}>Sign In</button>
          <button style={s.tabBtn(mode === "signup")} onClick={() => setMode("signup")}>Sign Up</button>
        </div>

        {/* Inputs */}
        <div style={s.inputWrap(focused === "email")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={focused === "email" ? "#3D9A58" : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
          <input
            style={s.input} type="email" placeholder="Email address"
            value={email} onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={s.inputWrap(focused === "pw")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={focused === "pw" ? "#3D9A58" : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              style={s.input} type="password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("pw")} onBlur={() => setFocused(null)}
            />
          </div>
          {mode === "login" && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 13, color: "#3D9A58", cursor: "pointer" }}>
                Forgot password?
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <button style={s.primaryBtn} onClick={() => navigate("home")}>
          {mode === "login" ? "Sign In" : "Create Account"}
        </button>

        {/* Divider */}
        <div style={s.dividerRow}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <div style={s.dividerLine} />
        </div>

        {/* Social */}
        <div style={s.socialRow}>
          <button style={s.socialBtn()} onClick={() => navigate("home")}>
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.45 22.56 15.55 22.56 12.25z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button style={s.socialBtn(true)} onClick={() => navigate("home")}>
            <svg width="14" height="17" viewBox="0 0 814 1000" fill="white">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.8-57.8-155.5-127.4C46.9 790.5 0 650 0 517.8 0 325.7 108.2 224.5 215.5 224.5c63.5 0 116.6 41.8 155.7 41.8 37.3 0 107.6-44.2 176.2-44.2 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
            </svg>
            Apple
          </button>
        </div>

        <button style={s.usernameBtn} onClick={() => navigate("home")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Continue with Username
        </button>
      </div>
    </div>
  );
}
