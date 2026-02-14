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
  loading: boolean;
  error: string;
  onModeChange: (mode: AuthMode) => void;
  onFieldChange: (field: keyof AuthFormState, value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
};

function AuthPage({
  mode,
  form,
  loading,
  error,
  onModeChange,
  onFieldChange,
  onSubmit,
  onBack,
}: AuthPageProps) {
  return (
    <main className="authPage">
      <section className="authCard" aria-label="Authentication">
        <button className="authBackButton" type="button" onClick={onBack}>
          Back
        </button>

        <h1>Glytch Chat</h1>
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
