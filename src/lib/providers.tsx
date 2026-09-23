/**
 * Theme and auth context.
 *
 * Theme: the current design is light-only, so this only mirrors a stored
 * preference onto <html data-theme>. Kept for the (unused) ThemeToggle until
 * the design settles on whether a dark theme returns.
 *
 * Auth: there is no login screen. The token lives in localStorage and is
 * verified against /auth/me on mount; when it is missing, app routes call
 * `useEnsureSession()`, which mints one silently instead of redirecting.
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
import { useNavigate } from "react-router-dom";

import { IS_DEMO } from "./demo";
import { api, setToken, getToken } from "./api";
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
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Starts a session without a login screen. Safe to call repeatedly. */
  enterApp: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  enterApp: async () => {},
  logout: () => {},
});

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Lets enterApp() stay referentially stable while still seeing the latest user.
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        if (!cancelled) setUser(me);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * There is no login screen. Pressing "Launch Zambot" calls this, which mints a
   * session silently - instant in demo mode, and a guest account against a
   * real backend.
   */
  const enterApp = useCallback(async () => {
    if (userRef.current) return;
    const result = await api.login("", "");
    setToken(result.access_token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/");
  }, [navigate]);

  const value = useMemo(
    () => ({ user, loading, enterApp, logout }),
    [user, loading, enterApp, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Guarantees a session for the app routes. Because there is no login screen,
 * a missing session is simply created rather than redirected away - so a
 * deep link into /chats/<id> still works on a cold browser.
 */
export function useEnsureSession() {
  const { user, loading, enterApp } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    let cancelled = false;
    enterApp().catch(() => {
      if (cancelled) return;
      // A real backend that refuses a guest session: send them back to the
      // landing page rather than leaving a dead screen.
      setFailed(true);
      if (!IS_DEMO) navigate("/", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user, enterApp, navigate]);

  return { user, loading: loading || (!user && !failed), failed };
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
