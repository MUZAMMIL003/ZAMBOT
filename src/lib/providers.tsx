/**
 * Theme and auth context.
 *
 * Theme: the current design is light-only, so this only mirrors a stored
 * preference onto <html data-theme>. Kept for the (unused) ThemeToggle until
 * the design settles on whether a dark theme returns.
 *
 * Auth: Supabase sign-in (Google or an emailed magic link). Supabase keeps
 * the session in the browser and refreshes it; once a session exists the
 * server is asked who it is (/me), which also enforces the invite list.
 *
 *   loading      working out whether someone is signed in
 *   signed-out   no session - app routes send them to /login
 *   signed-in    a session the server accepted; `user` is set
 *   not-invited  a real sign-in, but the email is not on the invite list
 *   unavailable  the server could not be reached (Render may be waking up)
 *
 * Demo mode has no sign-in: the demo user is always signed in.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { IS_DEMO } from "./demo";
import { api, onUnauthorized, type ApiError } from "./api";
import { returnUrl, supabase } from "./supabase";
import type { User } from "./types";

// ------------------------------------------------------------------ theme
type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

export const THEME_STORAGE_KEY = "zambot.theme";

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ------------------------------------------------------------------- auth
export type AuthStatus = "loading" | "signed-out" | "signed-in" | "not-invited" | "unavailable";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  /** The email of the current sign-in, known even when it is not invited. */
  email: string | null;
  signInWithGoogle: (next?: string) => Promise<void>;
  sendMagicLink: (email: string, next?: string) => Promise<void>;
  /** Ask the server again, e.g. after it was unreachable. */
  retry: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: "loading",
  email: null,
  signInWithGoogle: async () => {},
  sendMagicLink: async () => {},
  retry: () => {},
  logout: async () => {},
});

const WAKE_TRIES = 4;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const loadedFor = useRef<string | null>(null);

  /** Ask the server who this session belongs to; a sleeping server gets a few tries. */
  const loadProfile = useCallback(async (sessionEmail: string | null, sessionId: string | null) => {
    setEmail(sessionEmail);
    for (let attempt = 1; attempt <= WAKE_TRIES; attempt++) {
      try {
        const me = await api.me();
        loadedFor.current = sessionId;
        setUser(me);
        setStatus("signed-in");
        return;
      } catch (caught) {
        const error = caught as ApiError;
        if (error.status === 403) {
          loadedFor.current = sessionId;
          setUser(null);
          setStatus("not-invited");
          return;
        }
        if (error.status === 401) {
          setUser(null);
          setStatus("signed-out");
          return;
        }
        if (attempt < WAKE_TRIES) await sleep(2500 * attempt);
      }
    }
    setStatus("unavailable");
  }, []);

  useEffect(() => {
    if (IS_DEMO) {
      void api.me().then((me) => {
        setUser(me);
        setEmail(me.email);
        setStatus("signed-in");
      });
      return;
    }
    if (!supabase) {
      setStatus("signed-out");
      return;
    }
    // Supabase reports the current session first (INITIAL_SESSION), then every
    // change. Work is deferred out of the callback, as Supabase recommends.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (!session) {
          loadedFor.current = null;
          setUser(null);
          setEmail(null);
          setStatus("signed-out");
          return;
        }
        if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN") return;
        if (loadedFor.current === session.user.id) return;
        void loadProfile(session.user.email ?? null, session.user.id);
      }, 0);
    });
    onUnauthorized(() => void supabase?.auth.signOut());
    return () => {
      data.subscription.unsubscribe();
      onUnauthorized(null);
    };
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async (next = "/chats") => {
    if (!supabase) throw new Error("Sign-in is not set up yet.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: returnUrl(next), queryParams: { prompt: "select_account" } },
    });
    if (error) throw error;
  }, []);

  const sendMagicLink = useCallback(async (address: string, next = "/chats") => {
    if (!supabase) throw new Error("Sign-in is not set up yet.");
    const { error } = await supabase.auth.signInWithOtp({
      email: address.trim(),
      options: { emailRedirectTo: returnUrl(next), shouldCreateUser: true },
    });
    if (error) throw error;
  }, []);

  const retry = useCallback(() => {
    if (!supabase) return;
    setStatus("loading");
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void loadProfile(data.session.user.email ?? null, data.session.user.id);
      else setStatus("signed-out");
    });
  }, [loadProfile]);

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    navigate("/");
  }, [navigate]);

  const value = useMemo(
    () => ({ user, status, email, signInWithGoogle, sendMagicLink, retry, logout }),
    [user, status, email, signInWithGoogle, sendMagicLink, retry, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * For the app routes: anyone not signed in (or not invited) is sent to
 * /login, which brings them back to the page they wanted afterwards.
 */
export function useEnsureSession() {
  const { user, status, retry } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status !== "signed-out" && status !== "not-invited") return;
    const next = `${location.pathname}${location.search}`;
    navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
  }, [status, navigate, location.pathname, location.search]);

  return { user, status, retry, loading: status === "loading" };
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
