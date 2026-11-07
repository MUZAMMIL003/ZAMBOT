/**
 * The signed-in person's plan as the server reports it on /me: a guest (a free
 * trial with small limits) or a member (signed in with Google). The server
 * enforces every limit; the app only explains them.
 */
import { IS_DEMO } from "./demo";
import { useAuth } from "./providers";
import { AUTH_CONFIGURED } from "./supabase";
import type { PlanLimits, User } from "./types";

/** The plan, today's use, and whether Google sign-in is on offer. */
export function useGuestPlan() {
  const { user } = useAuth();
  const guest = user?.plan === "guest" || user?.auth_provider === "guest";
  return { guest, limits: user?.limits ?? null, usage: user?.usage ?? null, canSignIn: AUTH_CONFIGURED && !IS_DEMO };
}

/** "Guest · files up to 2 MB, 15 pages · 2 of 3 uploads left today"; nothing for members. */
export function guestUploadHint(limits: PlanLimits | null, usage: User["usage"] | null): string | null {
  if (!limits || limits.plan !== "guest") return null;
  const left = Math.max(0, limits.uploads_per_day - (usage?.uploads ?? 0));
  return `Guest · files up to ${limits.file_mb} MB, ${limits.pages} pages · ${left} of ${limits.uploads_per_day} uploads left today`;
}
