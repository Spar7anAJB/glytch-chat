import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ChatDashboard from "./ChatDashboard";
import {
  getCurrentUser,
  getMyProfile,
  isUsernameAvailable,
  refreshSession,
  signIn,
  signUp,
  upsertMyProfile,
} from "./supabaseApi";
import "./App.css";

type AuthMode = "login" | "signup";

type SessionUser = {
  id: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
};

const SESSION_KEY = "glytch_supabase_session";
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;
const ACCESS_TOKEN_MIN_REFRESH_DELAY_MS = 15_000;
const ACCESS_TOKEN_FALLBACK_REFRESH_DELAY_MS = 25 * 60 * 1000;
const RESUME_REFRESH_THROTTLE_MS = 15_000;

type SessionUserPersisted = Omit<SessionUser, "expiresAt"> & { expiresAt?: number | null };

function parseJwtExpiry(accessToken: string): number | null {
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded) as { exp?: unknown };
    if (typeof parsed.exp !== "number") return null;
    return parsed.exp * 1000;
  } catch {
    return null;
  }
}

function withSessionExpiry(session: SessionUserPersisted): SessionUser {
  return {
    ...session,
    expiresAt: typeof session.expiresAt === "number" ? session.expiresAt : parseJwtExpiry(session.accessToken),
  };
}

function hasSessionShape(value: unknown): value is SessionUserPersisted {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.username === "string" &&
    typeof row.email === "string" &&
    typeof row.accessToken === "string" &&
    typeof row.refreshToken === "string"
  );
}

function saveSession(session: SessionUser) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(SESSION_KEY);
}

function loadSession(): SessionUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!hasSessionShape(parsed)) return null;
    return withSessionExpiry(parsed);
  } catch {
    return null;
  }
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function isValidUsername(username: string) {
  return /^[a-z0-9_.-]{3,24}$/.test(username);
}

function fallbackUsername(email: string, userId: string) {
  const base = email.split("@")[0].replace(/\s+/g, "").toLowerCase() || "user";
  const safeBase = base.replace(/[^a-z0-9_.-]/g, "") || "user";
  return `${safeBase}_${userId.replace(/-/g, "").slice(0, 6)}`;
}

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const currentUserRef = useRef<SessionUser | null>(null);
  const refreshInFlightRef = useRef<Promise<SessionUser | null> | null>(null);
  const lastResumeRefreshAtRef = useRef(0);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const applyRefreshedSession = useCallback(async (existing: SessionUser): Promise<SessionUser> => {
    const refreshed = await refreshSession(existing.refreshToken);
    const existingProfile = await getMyProfile(refreshed.access_token, refreshed.user.id);
    const resolvedUsername =
      existingProfile?.username ||
      normalizeUsername(
        refreshed.user.user_metadata?.username || existing.username || fallbackUsername(refreshed.user.email, refreshed.user.id),
      );

    await upsertMyProfile(
      refreshed.access_token,
      refreshed.user.id,
      refreshed.user.email,
      resolvedUsername,
      resolvedUsername,
    );

    return withSessionExpiry({
      id: refreshed.user.id,
      email: refreshed.user.email,
      username: resolvedUsername,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
    });
  }, []);

  const refreshCurrentSession = useCallback(
    async (force = false): Promise<SessionUser | null> => {
      const existing = currentUserRef.current;
      if (!existing) return null;

      const shouldRefresh =
        force ||
        !existing.expiresAt ||
        Date.now() >= existing.expiresAt - ACCESS_TOKEN_REFRESH_BUFFER_MS;

      if (!shouldRefresh) return existing;
      if (refreshInFlightRef.current) return refreshInFlightRef.current;

      const refreshPromise = (async () => {
        try {
          const next = await applyRefreshedSession(existing);
          saveSession(next);
          setCurrentUser(next);
          return next;
        } catch (err) {
          const message = err instanceof Error ? err.message.toLowerCase() : "";
          const shouldLogout =
            message.includes("refresh token") ||
            message.includes("invalid grant") ||
            message.includes("session not found") ||
            message.includes("jwt expired") ||
            message.includes("invalid jwt");
          if (shouldLogout) {
            clearSession();
            return null;
          }
          return existing;
        } finally {
          refreshInFlightRef.current = null;
        }
      })();

      refreshInFlightRef.current = refreshPromise;
      return refreshPromise;
    },
    [applyRefreshedSession, clearSession],
  );

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const existing = loadSession();
      if (!existing) return;

      try {
        const maybeRefreshed =
          !existing.expiresAt || Date.now() >= existing.expiresAt - ACCESS_TOKEN_REFRESH_BUFFER_MS
            ? await applyRefreshedSession(existing)
            : existing;

        const user = await getCurrentUser(maybeRefreshed.accessToken);
        const existingProfile = await getMyProfile(maybeRefreshed.accessToken, user.id);
        const resolvedUsername =
          existingProfile?.username ||
          normalizeUsername(user.user_metadata?.username || existing.username || fallbackUsername(user.email, user.id));

        await upsertMyProfile(maybeRefreshed.accessToken, user.id, user.email, resolvedUsername, resolvedUsername);

        const next = withSessionExpiry({
          ...maybeRefreshed,
          id: user.id,
          email: user.email,
          username: resolvedUsername,
        });
        saveSession(next);
        if (!cancelled) {
          setCurrentUser(next);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        if (msg.includes("jwt expired") || msg.includes("invalid jwt")) {
          try {
            const next = await applyRefreshedSession(existing);
            saveSession(next);
            if (!cancelled) {
              setCurrentUser(next);
            }
            return;
          } catch {
            if (!cancelled) {
              clearSession();
            }
            return;
          }
        }
        if (!cancelled) {
          clearSession();
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyRefreshedSession, clearSession]);

  useEffect(() => {
    if (!currentUser) return;

    const delay = currentUser.expiresAt
      ? Math.max(
          ACCESS_TOKEN_MIN_REFRESH_DELAY_MS,
          currentUser.expiresAt - Date.now() - ACCESS_TOKEN_REFRESH_BUFFER_MS,
        )
      : ACCESS_TOKEN_FALLBACK_REFRESH_DELAY_MS;

    const timeoutId = window.setTimeout(() => {
      void refreshCurrentSession(true);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentUser, refreshCurrentSession]);

  useEffect(() => {
    const refreshOnResume = () => {
      const now = Date.now();
      if (now - lastResumeRefreshAtRef.current < RESUME_REFRESH_THROTTLE_MS) return;
      lastResumeRefreshAtRef.current = now;
      void refreshCurrentSession(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      refreshOnResume();
    };

    window.addEventListener("focus", refreshOnResume);
    window.addEventListener("pageshow", refreshOnResume);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshOnResume);
      window.removeEventListener("pageshow", refreshOnResume);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshCurrentSession]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "signup") {
      const normalizedUsername = normalizeUsername(username);

      if (!normalizedUsername) {
        setError("Username is required.");
        return;
      }

      if (!isValidUsername(normalizedUsername)) {
        setError("Username must be 3-24 chars and use only letters, numbers, ., _, or - with no spaces.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const available = await isUsernameAvailable(normalizedUsername);
        if (!available) {
          setError("That username is already taken.");
          return;
        }

        const result = await signUp(normalizedEmail, password, normalizedUsername);
        if (!result.session) {
          setError("Check your email to confirm signup, then log in.");
          setMode("login");
          return;
        }

        await upsertMyProfile(
          result.session.access_token,
          result.session.user.id,
          result.session.user.email,
          normalizedUsername,
          normalizedUsername,
        );

        const sessionUser = withSessionExpiry({
          id: result.session.user.id,
          email: result.session.user.email,
          username: normalizedUsername,
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
        });

        saveSession(sessionUser);
        setCurrentUser(sessionUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session = await signIn(normalizedEmail, password);
      const existingProfile = await getMyProfile(session.access_token, session.user.id);
      const resolvedUsername =
        existingProfile?.username ||
        normalizeUsername(
          session.user.user_metadata?.username ||
            fallbackUsername(session.user.email, session.user.id),
        );

      await upsertMyProfile(
        session.access_token,
        session.user.id,
        session.user.email,
        resolvedUsername,
        resolvedUsername,
      );

      const sessionUser = withSessionExpiry({
        id: session.user.id,
        email: session.user.email,
        username: resolvedUsername,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });

      saveSession(sessionUser);
      setCurrentUser(sessionUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  if (currentUser) {
    return (
      <ChatDashboard
        currentUserId={currentUser.id}
        currentUserName={currentUser.username}
        accessToken={currentUser.accessToken}
        onLogout={logout}
      />
    );
  }

  return (
    <main className="authPage">
      <section className="authCard" aria-label="Authentication">
        <h1>Glytch Chat</h1>
        <p className="authSubtitle">Login or create an account to continue.</p>

        <div className="authTabs">
          <button
            className={mode === "login" ? "tab active" : "tab"}
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "tab active" : "tab"}
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Sign up
          </button>
        </div>

        <form className="authForm" onSubmit={handleAuthSubmit}>
          {mode === "signup" && (
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                placeholder="username"
                autoComplete="username"
              />
            </label>
          )}

          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "signup" && (
            <label>
              Confirm password
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

export default App;
