/**
 * Guest mode, said plainly. A guest is a free trial: small files, a few
 * uploads and questions a day, chats deleted after a few days. The server
 * enforces every limit; these pieces only explain them and offer the way out:
 *
 *   GuestSidebarCard  in the sidebar - "Guest · limited" + Sign in with Google
 *   GuestLimitCard    in a chat, when a guest hits a limit - a friendly card
 *                     instead of a red error
 *
 * The line under the composer comes from `guestUploadHint` in lib/plan.
 * Signing in keeps the guest chats: they move into the account.
 */
import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { GoogleMark } from "@/components/ui/GoogleMark";
import { Icon } from "@/components/ui/Icon";
import { ZMark } from "@/components/ui/Working";
import { useGuestPlan } from "@/lib/plan";
import { useAuth } from "@/lib/providers";
import { cn } from "@/lib/utils";

function SignInButton({ className }: { className?: string }) {
  const { signInWithGoogle } = useAuth();
  const { pathname, search } = useLocation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setFailed(false);
          signInWithGoogle(`${pathname}${search}`).catch(() => {
            setBusy(false);
            setFailed(true);
          });
        }}
        className={cn(
          "flex h-10 w-full items-center justify-center gap-2 rounded-full border border-black/[0.07] bg-white text-[13.5px] font-medium shadow-sm transition hover:bg-white/80 hover:shadow disabled:cursor-wait",
          className,
        )}
      >
        {busy ? <ZMark size={16} /> : <GoogleMark size={16} />}
        Sign in with Google
      </button>
      {failed && <p className="mt-1.5 text-center text-[11.5px] text-danger">Sign-in did not start. Try again.</p>}
    </>
  );
}

export function GuestSidebarCard() {
  const { guest, limits, usage, canSignIn } = useGuestPlan();
  if (!guest) return null;
  const questionsLeft = limits ? Math.max(0, limits.questions_per_day - (usage?.questions ?? 0)) : null;

  return (
    <div className="mx-3 mb-2 rounded-2xl border border-white/70 bg-white/60 p-3.5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-black/[0.06]">
          <Icon name="user" size={13} />
        </span>
        <span className="text-[13.5px] font-semibold">Guest mode</span>
        <span className="ml-auto rounded-full bg-black/[0.06] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-black/55">
          Limited
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-black/55">
        {limits
          ? `Files up to ${limits.file_mb} MB · ${questionsLeft} of ${limits.questions_per_day} questions left today · chats deleted after ${limits.keep_days} days.`
          : "Small files only · chats deleted after a few days."}
      </p>
      {canSignIn && (
        <>
          <SignInButton className="mt-3" />
          <p className="mt-1.5 text-center text-[11px] text-black/40">Free · full access · your chats come with you</p>
        </>
      )}
    </div>
  );
}

/** Shown in a chat when a guest reaches a limit. */
export function GuestLimitCard({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const { canSignIn } = useGuestPlan();
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className="rounded-card border border-white/70 bg-white/70 px-4 py-3.5 shadow-sm backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#2B2B30] text-white">
          <Icon name="zap" size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Guest limit reached</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-black/60">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-black/40 hover:bg-black/5 hover:text-black"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
      {canSignIn && (
        <div className="mt-3 sm:ml-10 sm:max-w-[260px]">
          <SignInButton />
          <p className="mt-1.5 text-center text-[11px] text-black/40">Free · your guest chats come with you</p>
        </div>
      )}
    </motion.div>
  );
}
