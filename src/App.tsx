import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "@/routes/AppShell";
import { Landing } from "@/routes/Landing";

// The app screens sit behind the CTA, so they are not needed for first paint.
const Start = lazy(() => import("@/routes/Start").then((m) => ({ default: m.Start })));
const Conversation = lazy(() =>
  import("@/routes/Conversation").then((m) => ({ default: m.Conversation })),
);
const Files = lazy(() => import("@/routes/Files").then((m) => ({ default: m.Files })));
const Settings = lazy(() =>
  import("@/routes/Settings").then((m) => ({ default: m.Settings })),
);

function RouteFallback() {
  return (
    <div className="grid h-full place-items-center">
      <span
        role="status"
        aria-label="Loading"
        className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(var(--accent-bright))] border-t-transparent"
      />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        element={
          <AppShell>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </AppShell>
        }
      >
        {/* Home and New Chat are one screen: the composer-first start page. */}
        <Route path="/chats" element={<Start />} />
        <Route path="/chats/new" element={<Start />} />
        <Route path="/chats/files" element={<Files />} />
        <Route path="/chats/settings" element={<Settings />} />
        <Route path="/chats/:chatId" element={<Conversation />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
