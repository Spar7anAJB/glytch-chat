import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ChatDashboard from "./ChatDashboard";
import DownloadPage from "./pages/DownloadPage";
import {
  claimSingleSessionLock,
  getCurrentUser,
  getMyProfile,
  isUsernameAvailable,
  refreshSession,
  releaseSingleSessionLock,
  signIn,
  signUp,
  upsertMyProfile,
} from "./supabaseApi";
import AuthPage, { type AuthFormState, type AuthMode } from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import RouteGuardPage from "./pages/RouteGuardPage";
import { useHashRoute } from "./routing/useHashRoute";
import { fallbackUsername, isValidUsername, normalizeUsername } from "./lib/auth";
import { desktopInstallerUrls } from "./lib/assets";
import {
  clearSessionStorage,
  generateSingleSessionId,
  getStoredSessionPersistence,
  loadSession,
  saveSession,
  type SessionPersistence,
  withSessionExpiry,
} from "./lib/sessionStorage";
import type { SessionUser } from "./types/session";
import "./App.css";
import "./routes.css";

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;
const ACCESS_TOKEN_MIN_REFRESH_DELAY_MS = 15_000;
const ACCESS_TOKEN_FALLBACK_REFRESH_DELAY_MS = 25 * 60 * 1000;
const RESUME_REFRESH_THROTTLE_MS = 15_000;
const REMEMBER_ME_PREF_KEY = "glytch_remember_me";
const SINGLE_SESSION_CONFLICT_MESSAGE = "This account is already active in another session.";

function isSingleSessionConflictMessage(rawMessage: string) {
  const message = rawMessage.toLowerCase();
  return (
    message.includes("already active in another session") ||
    message.includes("another active session") ||
    message.includes("single session")
  );
}

const EMPTY_AUTH_FORM: AuthFormState = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthFormState>(EMPTY_AUTH_FORM);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_PREF_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const { route, navigate } = useHashRoute();

  const currentUserRef = useRef<SessionUser | null>(null);
  const sessionPersistenceRef = useRef<SessionPersistence>("session");
  const refreshInFlightRef = useRef<Promise<SessionUser | null> | null>(null);
  const lastResumeRefreshAtRef = useRef(0);

  const clearSession = useCallback(() => {
    clearSessionStorage();
    sessionPersistenceRef.current = "session";
    setCurrentUser(null);
  }, []);

  const clearSessionForSingleSessionConflict = useCallback(() => {
    clearSession();
    setError(SINGLE_SESSION_CONFLICT_MESSAGE);
    navigate("/auth", true);
  }, [clearSession, navigate]);

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

    const next = withSessionExpiry({
      id: refreshed.user.id,
      email: refreshed.user.email,
      username: resolvedUsername,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      singleSessionId: existing.singleSessionId,
    });

    await claimSingleSessionLock(next.accessToken, next.singleSessionId);
    return next;
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
          saveSession(next, sessionPersistenceRef.current);
          setCurrentUser(next);
          return next;
        } catch (err) {
          const message = err instanceof Error ? err.message.toLowerCase() : "";
          const shouldLogout =
            message.includes("refresh token") ||
            message.includes("invalid grant") ||
            message.includes("session not found") ||
            message.includes("jwt expired") ||
            message.includes("invalid jwt") ||
            isSingleSessionConflictMessage(message);
          if (shouldLogout) {
            if (isSingleSessionConflictMessage(message)) {
              clearSessionForSingleSessionConflict();
            } else {
              clearSession();
            }
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
    [applyRefreshedSession, clearSession, clearSessionForSingleSessionConflict],
  );

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const existing = loadSession();
      if (!existing) return;
      const storedPersistence = getStoredSessionPersistence();
      if (storedPersistence) {
        sessionPersistenceRef.current = storedPersistence;
        setRememberMe(storedPersistence === "local");
      }

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

        if (maybeRefreshed === existing) {
          await claimSingleSessionLock(next.accessToken, next.singleSessionId);
        }

        saveSession(next, sessionPersistenceRef.current);
        if (!cancelled) {
          setCurrentUser(next);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        if (msg.includes("jwt expired") || msg.includes("invalid jwt")) {
          try {
            const next = await applyRefreshedSession(existing);
            saveSession(next, sessionPersistenceRef.current);
            if (!cancelled) {
              setCurrentUser(next);
            }
            return;
          } catch (retryErr) {
            if (!cancelled) {
              const retryMessage = retryErr instanceof Error ? retryErr.message : "";
              if (isSingleSessionConflictMessage(retryMessage)) {
                clearSessionForSingleSessionConflict();
              } else {
                clearSession();
              }
            }
            return;
          }
        }

        if (!cancelled) {
          if (isSingleSessionConflictMessage(msg)) {
            clearSessionForSingleSessionConflict();
          } else {
            clearSession();
          }
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyRefreshedSession, clearSession, clearSessionForSingleSessionConflict]);

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

  useEffect(() => {
    if (!currentUser) return;
    if (route !== "/auth") return;
    if (window.electronAPI?.isElectron) return;
    navigate("/app", true);
  }, [currentUser, route, navigate]);

  useEffect(() => {
    if (!window.electronAPI?.isElectron) return;
    if (route !== "/") return;
    navigate("/auth", true);
  }, [route, navigate]);

  const updateAuthField = useCallback((field: keyof AuthFormState, value: string) => {
    setForm((existing) => ({
      ...existing,
      [field]: value,
    }));
  }, []);

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail || !form.password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "signup") {
      const normalizedUsername = normalizeUsername(form.username);

      if (!normalizedUsername) {
        setError("Username is required.");
        return;
      }

      if (!isValidUsername(normalizedUsername)) {
        setError("Username must be 3-24 chars and use only letters, numbers, ., _, or - with no spaces.");
        return;
      }

      if (form.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (form.password !== form.confirmPassword) {
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

        const result = await signUp(normalizedEmail, form.password, normalizedUsername);
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

        const singleSessionId = generateSingleSessionId();
        await claimSingleSessionLock(result.session.access_token, singleSessionId);

        const sessionUser = withSessionExpiry({
          id: result.session.user.id,
          email: result.session.user.email,
          username: normalizedUsername,
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          singleSessionId,
        });

        sessionPersistenceRef.current = "session";
        saveSession(sessionUser, "session");
        setCurrentUser(sessionUser);
        navigate("/app");
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
      const session = await signIn(normalizedEmail, form.password);
      const existingProfile = await getMyProfile(session.access_token, session.user.id);
      const resolvedUsername =
        existingProfile?.username ||
        normalizeUsername(session.user.user_metadata?.username || fallbackUsername(session.user.email, session.user.id));

      await upsertMyProfile(
        session.access_token,
        session.user.id,
        session.user.email,
        resolvedUsername,
        resolvedUsername,
      );

      const singleSessionId = generateSingleSessionId();
      await claimSingleSessionLock(session.access_token, singleSessionId);

      const sessionUser = withSessionExpiry({
        id: session.user.id,
        email: session.user.email,
        username: resolvedUsername,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        singleSessionId,
      });

      const persistence: SessionPersistence = rememberMe ? "local" : "session";
      sessionPersistenceRef.current = persistence;
      saveSession(sessionUser, persistence);
      localStorage.setItem(REMEMBER_ME_PREF_KEY, rememberMe ? "1" : "0");
      setCurrentUser(sessionUser);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const existing = currentUserRef.current;
    if (existing) {
      void releaseSingleSessionLock(existing.accessToken, existing.singleSessionId).catch(() => {});
    }

    clearSession();
    setForm((existing) => ({
      ...existing,
      password: "",
      confirmPassword: "",
    }));
    setError("");
    navigate(window.electronAPI?.isElectron ? "/auth" : "/");
  };

  if (route === "/") {
    return (
      <LandingPage
        onGoToAuth={() => {
          setError("");
          navigate("/auth");
        }}
        onGoToDownload={() => navigate("/download")}
      />
    );
  }

  if (route === "/download") {
    return (
      <DownloadPage
        macInstallerUrl={desktopInstallerUrls.mac}
        windowsInstallerUrl={desktopInstallerUrls.windows}
        linuxInstallerUrl={desktopInstallerUrls.linux}
        onBackHome={() => navigate("/")}
        onStartChatting={() => navigate("/auth")}
      />
    );
  }

  if (route === "/auth") {
    return (
      <AuthPage
        mode={mode}
        form={form}
        rememberMe={rememberMe}
        loading={loading}
        error={error}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          setError("");
        }}
        onFieldChange={updateAuthField}
        onRememberMeChange={setRememberMe}
        onSubmit={handleAuthSubmit}
        onBack={() => {
          setError("");
          navigate(window.electronAPI?.isElectron ? "/auth" : "/");
        }}
      />
    );
  }

  if (!currentUser) {
    return <RouteGuardPage onGoToAuth={() => navigate("/auth")} />;
  }

  return (
    <ChatDashboard
      currentUserId={currentUser.id}
      currentUserName={currentUser.username}
      accessToken={currentUser.accessToken}
      onLogout={logout}
    />
  );
}

export default App;
