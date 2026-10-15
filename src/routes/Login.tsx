/**
 * Sign in (/login). The app's own pastel glass: the wordmark types itself,
 * then two ways in - "Continue with Google", or an emailed magic link (no
 * password). It also covers what can happen around a sign-in:
 *
 *   sent         the magic link is on its way - check the inbox
 *   not invited  signed in fine, but the email is not on the invite list
 *   error        Google or the link came back with an error
 *
 * Once signed in it goes on to `?next=` (where they were heading) or /chats.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { Aurora } from "@/components/ui/Aurora";
import { Icon } from "@/components/ui/Icon";
import { ZMark } from "@/components/ui/Working";
import { IS_DEMO } from "@/lib/demo";
import { useAuth } from "@/lib/providers";
import { AUTH_CONFIGURED, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const RESEND_SECONDS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Errors Supabase hands back in the address after Google or an old link. */
function returnedError(params: URLSearchParams): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const raw = params.get("error_description") || hash.get("error_description") || params.get("error") || hash.get("error");
  if (!raw) return null;
  const text = raw.replace(/\+/g, " ");
  if (/expired|invalid/i.test(text)) return "That sign-in link has expired or was already used. Send yourself a new one.";
  if (/access_denied|cancel/i.test(text)) return "Sign-in was cancelled.";
  return text;
}

function friendly(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/rate limit|too many|seconds/i.test(message)) return "Too many sign-in emails just now. Wait a minute and try again.";
  if (/provider is not enabled|unsupported provider/i.test(message)) return "Google sign-in is not switched on yet. Use the email link for now.";
  if (/not set up/i.test(message)) return message;
  return "Sign-in did not go through. Please try again.";
}

export function Login() {
  const { status, email: signedInEmail, signInWithGoogle, sendMagicLink, retry } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next")?.startsWith("/") ? (params.get("next") as string) : "/chats";

  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(() => returnedError(params));
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (status === "signed-in") navigate(next, { replace: true });
  }, [status, next, navigate]);

  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const google = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle(next);
    } catch (caught) {
      setError(friendly(caught));
      setBusy(null);
    }
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setBusy("email");
    try {
      await sendMagicLink(address, next);
      setSentTo(address);
      setWait(RESEND_SECONDS);
    } catch (caught) {
      setError(friendly(caught));
    } finally {
      setBusy(null);
    }
  };

  const switchAccount = async () => {
    await supabase?.auth.signOut();
    setSentTo(null);
    setError(null);
  };

  const notInvited = status === "not-invited";
  const checking = status === "loading" || status === "signed-in";
  const unconfigured = !IS_DEMO && !AUTH_CONFIGURED;

  return (
    <div className="motion-essential relative flex min-h-dvh flex-col overflow-hidden mesh-bg">
      <Aurora />
      <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8">
        <Link to="/" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-medium text-black/55 transition hover:bg-white/60 hover:text-black">
          <Icon name="arrowLeft" size={15} />
          Home
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-[420px] rounded-[30px] border border-white/70 bg-white/55 p-6 shadow-[0_40px_90px_-40px_rgba(76,58,140,0.45)] backdrop-blur-xl sm:p-8"
        >
          <div className="flex flex-col items-center text-center">
            <AnimatedLogo className="w-[128px] text-black" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={notInvited ? "invite" : sentTo ? "sent" : "start"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="mt-6"
              >
                <h1 className="text-[24px] font-semibold tracking-[-0.02em]">
                  {notInvited ? "Not on the list yet" : sentTo ? "Check your inbox" : "Sign in to Zambot"}
                </h1>
                <p className="mx-auto mt-2 max-w-[32ch] text-[14.5px] leading-relaxed text-black/55">
                  {notInvited ? (
                    <>
                      <b className="font-medium text-black">{signedInEmail}</b> is not invited to Zambot yet. Ask the owner to add
                      you, or use another account.
                    </>
                  ) : sentTo ? (
                    <>
                      We sent a sign-in link to <b className="font-medium text-black">{sentTo}</b>. Open it on this device to
                      continue.
                    </>
                  ) : (
                    "Your chats and files stay private to your account."
                  )}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-7">
            {checking && !error ? (
              <div className="flex items-center justify-center gap-2.5 py-6 text-[14px] text-black/55">
                <ZMark size={20} />
                Signing you in…
              </div>
            ) : status === "unavailable" ? (
              <div className="space-y-3 text-center">
                <p className="text-[14px] text-black/60">Zambot's server is not answering - it may be waking up.</p>
                <button type="button" onClick={retry} className="h-12 w-full rounded-full bg-[#2B2B30] text-[15px] font-medium text-white transition hover:bg-[#1F1F23]">
                  Try again
                </button>
              </div>
            ) : notInvited ? (
              <button
                type="button"
                onClick={() => void switchAccount()}
                className="h-12 w-full rounded-full bg-[#2B2B30] text-[15px] font-medium text-white transition hover:bg-[#1F1F23]"
              >
                Use another account
              </button>
            ) : sentTo ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-3.5 text-[13px] leading-relaxed text-black/60">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black text-white">
                    <Icon name="check" size={13} strokeWidth={2.6} />
                  </span>
                  The link works once and expires in an hour. Not there? Check spam or promotions.
                </div>
                <button
                  type="button"
                  disabled={wait > 0 || busy !== null}
                  onClick={() => void send()}
                  className="h-11 w-full rounded-full border border-white bg-white/80 text-[14px] font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:text-black/40"
                >
                  {busy === "email" ? "Sending…" : wait > 0 ? `Send again in ${wait}s` : "Send the link again"}
                </button>
                <button type="button" onClick={() => setSentTo(null)} className="w-full py-1.5 text-[13.5px] font-medium text-black/55 hover:text-black">
                  Use a different email
                </button>
              </div>
            ) : (
              <div className={cn("space-y-4", unconfigured && "pointer-events-none opacity-50")}>
                <button
                  type="button"
                  onClick={() => void google()}
                  disabled={busy !== null}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-black/[0.07] bg-white text-[15px] font-medium shadow-sm transition hover:bg-white/80 hover:shadow disabled:cursor-wait"
                >
                  {busy === "google" ? <ZMark size={18} /> : <GoogleMark />}
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 text-[11.5px] font-medium uppercase tracking-wider text-black/35">
                  <span className="h-px flex-1 bg-black/[0.08]" />
                  or
                  <span className="h-px flex-1 bg-black/[0.08]" />
                </div>

                <form noValidate onSubmit={(event) => void send(event)} className="space-y-2.5">
                  <label className="sr-only" htmlFor="login-email">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-full border border-black/[0.07] bg-white/80 px-5 text-[16px] outline-none transition placeholder:text-black/35 focus:border-black/20 focus:bg-white sm:text-[15px]"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null}
                    className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#2B2B30] text-[15px] font-medium text-white shadow-[0_12px_30px_-14px_rgba(0,0,0,0.5)] transition hover:bg-[#1F1F23] disabled:cursor-wait"
                  >
                    {busy === "email" && <ZMark size={17} className="text-white" />}
                    {busy === "email" ? "Sending your link…" : "Email me a sign-in link"}
                  </button>
                </form>
              </div>
            )}

            {unconfigured && (
              <p role="alert" className="mt-4 rounded-2xl bg-white/70 p-3 text-center text-[12.5px] leading-relaxed text-black/60">
                Sign-in is not set up on this site yet: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-2xl border border-danger/20 bg-white/70 p-3 text-center text-[13px] text-danger">
                {error}
              </p>
            )}
          </div>

          <p className="mt-7 text-center text-[12px] text-black/40">No password needed · Free</p>
        </motion.div>
      </main>
    </div>
  );
}
