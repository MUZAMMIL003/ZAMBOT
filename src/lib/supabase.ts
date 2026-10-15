/**
 * Sign-in, handled by Supabase Auth: "Continue with Google" and an emailed
 * magic link. The session (and its automatic refresh) lives in the browser;
 * every API call sends its access token, and the backend checks it.
 *
 * Needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the project's public
 * "anon" / publishable key - never the service key). Demo mode needs neither.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { IS_DEMO } from "./demo";

const PROJECT_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const AUTH_CONFIGURED = Boolean(PROJECT_URL && ANON_KEY);

export const supabase: SupabaseClient | null =
  !IS_DEMO && AUTH_CONFIGURED
    ? createClient(PROJECT_URL, ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      })
    : null;

/** The current access token, refreshed first if it is about to expire. */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Where to send the browser back to after Google or the emailed link. */
export function returnUrl(next: string): string {
  const url = new URL("/login", window.location.origin);
  if (next && next !== "/login") url.searchParams.set("next", next);
  return url.toString();
}
