import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/auth";

const FEATURES: [string, string][] = [
  ["Real account", "Sign up once, log in anytime from any browser."],
  ["Chat with AI", "Ask anything — get clear, thorough answers instantly."],
  ["Anime companion", "Your unique AI companion is chosen by your username."],
];

export default function AuthScreen() {
  const register = useAuth((s) => s.register);
  const login    = useAuth((s) => s.login);

  const [mode, setMode]       = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError(null);
    if (username.trim().length < 3) return setError("Username needs at least 3 characters.");
    if (password.length < 6)        return setError("Password needs at least 6 characters.");
    setBusy(true);
    try {
      if (mode === "signup") {
        await register(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
      setSuccess(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      // Give clearer messages for common cases
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("wrong")) {
        setError("Incorrect username or password. Please try again.");
      } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no user")) {
        setError("No account found with that username. Did you mean to sign up?");
      } else if (msg.toLowerCase().includes("exists") || msg.toLowerCase().includes("taken")) {
        setError("That username is already taken. Try a different one or log in.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="auth-root">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-inner">
        {/* ── Hero ── */}
        <div className="auth-hero">
          <div className="auth-logo">
            <div className="auth-logo-mark">
              <svg viewBox="0 0 28 28" fill="none" width="16" height="16">
                <path d="M14 3L25 21H3L14 3Z" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <span className="auth-logo-text">Vela</span>
          </div>

          <div className="auth-eyebrow">Your AI assistant</div>
          <h1 className="auth-heading">
            Ask anything.<br />
            Get a <span className="auth-heading-accent">clear</span> answer.
          </h1>
          <p className="auth-sub">
            Vela is a powerful AI assistant with your own account. Sign in and start a conversation instantly.
          </p>

          <ul className="auth-features">
            {FEATURES.map(([title, desc]) => (
              <li key={title} className="auth-feature-item">
                <span className="auth-feature-check">✓</span>
                <span>
                  <b className="auth-feature-title">{title}</b>
                  <span className="auth-feature-desc">{desc}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="auth-anime-hint">
            🎌 Your anime companion is chosen based on your username!
          </div>
        </div>

        {/* ── Auth card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="auth-card"
        >
          <h2 className="auth-card-title">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="auth-card-sub">
            {mode === "login"
              ? "Sign in to continue to Vela"
              : "Join Vela and meet your AI companion"}
          </p>

          <div className="auth-tabs">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`auth-tab ${mode === m ? "auth-tab-active" : ""}`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="auth-error"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <label className="auth-label">Username</label>
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. naruto99"
            className="auth-input"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />

          <label className="auth-label">Password</label>
          <div className="auth-input-wrap">
            <input
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              type={show ? "text" : "password"}
              placeholder="At least 6 characters"
              className="auth-input"
              style={{ marginBottom: 0 }}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="auth-show-btn"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          {mode === "signup" && (
            <p className="auth-hint">
              🎌 Your anime companion will be chosen based on your username!
            </p>
          )}

          {mode === "login" && (
            <p className="auth-hint" style={{ marginTop: 8 }}>
              Use the same username and password you signed up with.
            </p>
          )}

          <button
            onClick={submit}
            disabled={busy || !username.trim() || !password}
            className="auth-submit-btn"
          >
            {busy
              ? mode === "login" ? "Logging in…" : "Creating account…"
              : mode === "login" ? "Log in" : "Create account"}
          </button>

          <p className="auth-switch">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="auth-switch-btn"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}