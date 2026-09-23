/**
 * Landing. No login: the CTA mints a session and goes straight into the app.
 *
 * One screen with a lot of air - the pixel wordmark types itself out, then a
 * single glass button fades in. Nothing scrolls.
 */
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { Aurora } from "@/components/ui/Aurora";
import { useAuth } from "@/lib/providers";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Landing() {
  const navigate = useNavigate();
  const { enterApp } = useAuth();
  const [working, setWorking] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically show the "Launch" button shortly after the logo animation finishes
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2400);
    return () => clearTimeout(timer);
  }, []);

  const go = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      await enterApp();
      navigate("/chats");
    } catch {
      setError("Zambot could not start a session. Please try again.");
      setWorking(false);
    }
  }, [working, enterApp, navigate]);

  return (
    <main className="relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-[rgb(var(--bg))]">
      <Aurora />

      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Animated Pixel Logo */}
        <AnimatedLogo className="w-[200px] text-[rgb(var(--text))] sm:w-[300px]" />

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showButton ? 1 : 0, y: showButton ? 0 : 10 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mt-16 sm:mt-24"
        >
          <button
            type="button"
            onClick={() => void go()}
            disabled={working || !showButton}
            className="group relative flex h-12 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--border))] bg-white/40 px-8 font-medium text-[rgb(var(--text))] shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white/70 disabled:cursor-wait sm:h-14 sm:px-10 sm:text-[15px]"
          >
            {working ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--text))]/30 border-t-[rgb(var(--text))]" />
            ) : (
              // The arrow hangs off the label so it never pushes it off-centre.
              <span className="relative">
                Launch Zambot
                <span
                  aria-hidden
                  className="absolute left-full top-0 ml-2 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
                >
                  &rarr;
                </span>
              </span>
            )}
          </button>
        </motion.div>

        {error && (
          <p role="alert" className="mt-4 text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

