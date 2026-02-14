import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

export type AuthMode = "login" | "signup";

export type AuthFormState = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type AuthPageProps = {
  mode: AuthMode;
  form: AuthFormState;
  rememberMe: boolean;
  loading: boolean;
  error: string;
  onModeChange: (mode: AuthMode) => void;
  onFieldChange: (field: keyof AuthFormState, value: string) => void;
  onRememberMeChange: (remember: boolean) => void;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
};

function AuthPage({
  mode,
  form,
  rememberMe,
  loading,
  error,
  onModeChange,
  onFieldChange,
  onRememberMeChange,
  onSubmit,
  onBack,
}: AuthPageProps) {
  const typingPhrases = useMemo(() => ["Welcome to", "Glytch Chat"], []);
  const [typingPhraseIndex, setTypingPhraseIndex] = useState(0);
  const [typingCharIndex, setTypingCharIndex] = useState(0);
  const [typingDeleting, setTypingDeleting] = useState(false);
  const typingText = typingPhrases[typingPhraseIndex]?.slice(0, typingCharIndex) || "";

  useEffect(() => {
    const currentPhrase = typingPhrases[typingPhraseIndex] || "";
    let delayMs = typingDeleting ? 55 : 105;

    if (!typingDeleting && typingCharIndex >= currentPhrase.length) {
      delayMs = 950;
    } else if (typingDeleting && typingCharIndex <= 0) {
      delayMs = 280;
    }

    const timeoutId = window.setTimeout(() => {
      if (!typingDeleting && typingCharIndex >= currentPhrase.length) {
        setTypingDeleting(true);
        return;
      }
      if (typingDeleting && typingCharIndex <= 0) {
        setTypingDeleting(false);
        setTypingPhraseIndex((prev) => (prev + 1) % typingPhrases.length);
        return;
      }
      setTypingCharIndex((prev) => prev + (typingDeleting ? -1 : 1));
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [typingCharIndex, typingDeleting, typingPhraseIndex, typingPhrases]);

  return (
    <main className="authPage">
      <section className="authCard" aria-label="Authentication">
        <button className="authBackButton" type="button" onClick={onBack}>
          Back
        </button>

        <h1 className="site-title authSiteTitle">
          <span className="typing-text">{typingText}</span>
        </h1>
        <p className="glitch-text authModeTitle">{mode === "login" ? "Login" : "Sign Up"}</p>
        <p className="authSubtitle">Login or create an account to continue.</p>

        <div className="authTabs">
          <button
            className={mode === "login" ? "tab active" : "tab"}
            type="button"
            onClick={() => {
              onModeChange("login");
            }}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "tab active" : "tab"}
            type="button"
            onClick={() => {
              onModeChange("signup");
            }}
          >
            Sign up
          </button>
        </div>

        <form className="authForm" onSubmit={onSubmit}>
          {mode === "signup" && (
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => onFieldChange("username", event.target.value)}
                type="text"
                placeholder="username"
                autoComplete="username"
              />
            </label>
          )}

          <label>
            Email
            <input
              value={form.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              value={form.password}
              onChange={(event) => onFieldChange("password", event.target.value)}
              type="password"
              placeholder="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "signup" && (
            <label>
              Confirm password
              <input
                value={form.confirmPassword}
                onChange={(event) => onFieldChange("confirmPassword", event.target.value)}
                type="password"
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </label>
          )}

          {mode === "login" && (
            <label className="authRememberMe">
              <input
                checked={rememberMe}
                onChange={(event) => onRememberMeChange(event.target.checked)}
                type="checkbox"
              />
              Remember me
            </label>
          )}

          {error && <p className="authError">{error}</p>}

          <button className="authSubmit" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
