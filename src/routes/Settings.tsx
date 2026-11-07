import { useEffect, useState } from "react";

import { GuestSidebarCard } from "@/components/chat/GuestUpsell";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard, ListRow, SectionLabel } from "@/components/ui/List";
import { IS_DEMO, resetDemo } from "@/lib/api";
import { useChats } from "@/lib/chats-context";
import { useAuth } from "@/lib/providers";

/** "5 of 20 today", or "No daily limit" when the plan has none. */
function used(count: number | undefined, limit: number | undefined): string {
  if (!limit) return "No daily limit";
  return `${Math.min(count ?? 0, limit)} of ${limit} today`;
}

/** An information-only row: today's use of one limit. */
function UsageRow({ icon, label, detail }: { icon: IconName; label: string; detail: string }) {
  return (
    <div className="row-item pointer-events-none">
      <span aria-hidden className="icon-orb">
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{label}</span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted">{detail}</span>
      </span>
    </div>
  );
}

export function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const { chats, deleteAllChats } = useChats();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const guest = user?.auth_provider === "guest";
  const limits = user?.limits;
  const usage = user?.usage;

  // Today's numbers may have moved since sign-in.
  useEffect(() => {
    if (!IS_DEMO) void refreshUser();
  }, [refreshUser]);

  // An unconfirmed first tap quietly resets.
  useEffect(() => {
    if (!confirmReset && !confirmDelete && !confirmLeave) return;
    const timer = setTimeout(() => {
      setConfirmReset(false);
      setConfirmDelete(false);
      setConfirmLeave(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [confirmReset, confirmDelete, confirmLeave]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" />

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">

          {/* Phones only - on larger screens the sidebar already shows it. */}
          {guest && (
            <div className="mt-7 lg:hidden [&>div]:mx-0">
              <GuestSidebarCard />
            </div>
          )}

          {limits && !IS_DEMO && (
            <div className="mt-7">
              <SectionLabel>{guest ? "Guest limits" : "Your limits"}</SectionLabel>
              <ListCard>
                <UsageRow
                  icon="upload"
                  label="Uploads"
                  detail={`${used(usage?.uploads, limits.uploads_per_day)} · up to ${limits.file_mb} MB (Excel ${limits.sheet_file_mb} MB), ${limits.pages} pages`}
                />
                <UsageRow icon="message" label="Questions" detail={used(usage?.questions, limits.questions_per_day)} />
                <UsageRow icon="calculator" label="Spreadsheet maths" detail={used(usage?.calculations, limits.calculations_per_day)} />
                <UsageRow
                  icon="image"
                  label="Scanned pages"
                  detail={limits.scanned_pages ? `Read by AI, up to ${limits.scanned_pages} per file` : "Sign in with Google to read scanned PDFs"}
                />
                <UsageRow
                  icon="shield"
                  label="Kept for"
                  detail={limits.keep_days ? `${limits.keep_days} days, then deleted` : "Until you delete them"}
                />
              </ListCard>
              <p className="mt-2 px-1 text-[12px] text-muted">Daily counts reset at midnight UTC.</p>
            </div>
          )}

          <div className="mt-7">
            <SectionLabel>Your data</SectionLabel>
            <ListCard>
              <ListRow
                icon="folder"
                label="Files"
                detail="Documents across every chat"
                to="/chats/files"
              />
              {chats.length > 0 && (
                <ListRow
                  icon="trash"
                  label={confirmDelete ? "Tap again to delete everything" : "Delete all chats"}
                  detail={`${chats.length} chat${chats.length === 1 ? "" : "s"} and their documents`}
                  destructive
                  trailing={<span aria-hidden />}
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      return;
                    }
                    setConfirmDelete(false);
                    void deleteAllChats();
                  }}
                />
              )}
              {IS_DEMO && (
                <ListRow
                  icon="refresh"
                  label={confirmReset ? "Tap again to reset" : "Reset demo data"}
                  detail={
                    confirmReset
                      ? "Your chats and uploads will be replaced"
                      : "Restore the sample documents"
                  }
                  destructive={confirmReset}
                  onClick={() => {
                    if (!confirmReset) {
                      setConfirmReset(true);
                      return;
                    }
                    resetDemo();
                    window.location.reload();
                  }}
                />
              )}
            </ListCard>
          </div>

          <div className="mt-7">
            <SectionLabel>Account</SectionLabel>
            <ListCard>
              {/* Information only - there is nothing to edit yet. */}
              <div className="row-item pointer-events-none">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span aria-hidden className="icon-orb text-[14px] font-semibold uppercase">
                    {(user?.display_name || user?.email || "?").slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {user?.display_name || user?.email?.split("@")[0] || "You"}
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                    {guest
                      ? `Guest · chats deleted ${limits?.keep_days ?? 3} days after they're made`
                      : `${user?.email ?? ""}${user && !IS_DEMO ? ` · signed in with ${user.auth_provider === "google" ? "Google" : "an email link"}` : ""}`}
                  </span>
                </span>
                {IS_DEMO && (
                  <span className="shrink-0 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium text-muted">
                    Demo
                  </span>
                )}
              </div>
              <ListRow
                icon="logout"
                label={guest ? (confirmLeave ? "Tap again to leave" : "Leave guest mode") : "Log out"}
                detail={guest ? "Your guest chats cannot be opened again after this" : "Sign out on this device"}
                destructive
                trailing={<span aria-hidden />}
                onClick={() => {
                  if (guest && !confirmLeave) {
                    setConfirmLeave(true);
                    return;
                  }
                  void logout();
                }}
              />
            </ListCard>
          </div>

          <p className="mt-7 text-center text-[12px] text-muted">
            Zambot · answers grounded in your documents
          </p>
        </div>
      </div>
    </div>
  );
}
