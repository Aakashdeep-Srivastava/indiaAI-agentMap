"use client";

/* In-app notifications for enterprise owners.
 *
 * Every event that changes an enterprise's standing is triggered by someone
 * else — an officer approves, an officer allocates, the classifier runs — so
 * without this the owner had no way to learn any of it happened. The bell is
 * chrome on every portal page: it must never throw, and it must never block
 * the page it decorates.
 *
 * Bilingual EN/HI because the platform's audience is, and because every
 * explainer surface in this product carries the same toggle. Both languages
 * arrive on the row, so switching is local and instant — no refetch.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { apiFetch, getSession } from "@/lib/auth";
import { queryKeys } from "@/lib/query-provider";
import {
  NotificationFeedSchema,
  safeParseOr,
  type NotificationFeed,
  type NotificationItem as Item,
} from "@/lib/schemas";

const EMPTY_FEED: NotificationFeed = { items: [], unread: 0 };

async function fetchFeed(): Promise<NotificationFeed> {
  const res = await apiFetch("/notifications/");
  if (!res.ok) return EMPTY_FEED;
  // Validated at the boundary: a malformed feed degrades to empty rather than
  // rendering `undefined` into the panel. See lib/schemas.ts.
  return safeParseOr(NotificationFeedSchema, await res.json(), EMPTY_FEED, "/notifications");
}

/* Colour carries meaning here: green = something was granted, red = something
 * needs the owner's attention, saffron = an action is required of them,
 * brand blue = the AI did something, indigo = platform news. */
const EVENT_TONE: Record<string, string> = {
  registration_approved: "bg-emerald-100 text-emerald-700",
  snp_allocated: "bg-emerald-100 text-emerald-700",
  registration_rejected: "bg-red-100 text-red-600",
  action_needed: "bg-saffron-500/15 text-saffron-600",
  classification_complete: "bg-brand-50 text-brand-500",
  announcement: "bg-indigo-100 text-indigo-600",
};

// Nullish rather than nullable: the schema models an absent `created_at` as
// either null or undefined, and both must render as empty, not "NaN ago".
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  // Server timestamps are naive UTC; without the marker the browser reads
  // them as local time and every notification looks 5h30m old in IST.
  const then = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : new Date(then).toLocaleDateString("en-IN");
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: feed, isSuccess } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchFeed,
    enabled: typeof window !== "undefined" && !!getSession(),
    // Officer decisions land while the owner is already sitting on a page, so
    // poll gently. 60s is well inside the per-minute rate-limit budget and
    // still feels live for a decision that takes minutes to make. Unlike a
    // bare setInterval, this pauses when the tab is hidden.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const items: Item[] = feed?.items ?? [];
  const unread = feed?.unread ?? 0;

  /* Mutations write straight into the cache so the badge drops on click, and
   * settle by invalidating — a failed mark-read self-corrects on the next
   * fetch instead of leaving the UI lying about what has been read. */
  const markRead = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/notifications/${id}/read`, { method: "POST" }),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const previous = queryClient.getQueryData<NotificationFeed>(queryKeys.notifications);
      queryClient.setQueryData<NotificationFeed>(queryKeys.notifications, (old) =>
        old
          ? {
              items: old.items.map((i) => (i.id === id ? { ...i, is_read: true } : i)),
              unread: Math.max(0, old.unread - 1),
            }
          : old,
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.notifications, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const previous = queryClient.getQueryData<NotificationFeed>(queryKeys.notifications);
      queryClient.setQueryData<NotificationFeed>(queryKeys.notifications, (old) =>
        old ? { items: old.items.map((i) => ({ ...i, is_read: true })), unread: 0 } : old,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.notifications, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  /* An allocation notification means the enterprise's status just changed
   * server-side, which is what decides whether the sidebar shows Certificate.
   * Invalidate it here so the nav entry appears alongside the notification
   * announcing it, rather than up to a cache-lifetime later. */
  const hasAllocation = items.some((i) => i.event === "snp_allocated");
  useEffect(() => {
    if (hasAllocation) {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEnterprise });
    }
  }, [hasAllocation, queryClient]);

  // Close on outside click and on Escape — a panel that traps the user is
  // worse than no panel.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openItem(item: Item) {
    if (!item.is_read) markRead.mutate(item.id);
    if (item.href) {
      setOpen(false);
      router.push(item.href);
    }
  }

  // Render nothing at all until the first load resolves: a bell that appears
  // and then vanishes for admins (who have no enterprise feed) reads as a bug.
  if (!isSuccess || (items.length === 0 && unread === 0)) return null;

  return (
    <div className="fixed top-4 right-4 z-40" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` — ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-white shadow-sm transition-colors hover:bg-surface-50"
      >
        <Bell className="h-4 w-4 text-surface-600" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-saffron-500 px-1 text-[10px] font-bold text-white shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-12 right-0 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
              {hi ? "सूचनाएँ" : "Notifications"}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHi((v) => !v)}
                className="rounded-lg px-2 py-1 text-[10px] font-bold text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600"
                title="Switch language"
              >
                {hi ? "EN" : "हिं"}
              </button>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  title={hi ? "सभी पढ़ा हुआ चिह्नित करें" : "Mark all as read"}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-brand-500"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-surface-400">
                {hi ? "अभी कोई सूचना नहीं।" : "Nothing yet."}
              </p>
            ) : (
              items.map((item) => {
                const title = (hi && item.title_hi) || item.title_en;
                const body = (hi && item.body_hi) || item.body_en;
                return (
                  <button
                    key={item.id}
                    onClick={() => openItem(item)}
                    className={`flex w-full gap-3 border-b border-surface-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-50 ${
                      item.is_read ? "" : "bg-brand-50/40"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        EVENT_TONE[item.event] ?? "bg-surface-100 text-surface-500"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={`text-xs ${
                            item.is_read
                              ? "font-medium text-surface-600"
                              : "font-bold text-brand-900"
                          }`}
                        >
                          {title}
                        </span>
                        <span className="shrink-0 text-[10px] text-surface-400">
                          {timeAgo(item.created_at)}
                        </span>
                      </span>
                      {body && (
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-surface-500">
                          {body}
                        </span>
                      )}
                    </span>
                    {!item.is_read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
