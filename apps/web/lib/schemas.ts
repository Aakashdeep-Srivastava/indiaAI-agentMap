/* Runtime validation at the API boundary.
 *
 * The backend validates its *inputs* with Pydantic; nothing has ever
 * validated the frontend's *inputs* — every call site does `await res.json()`
 * and trusts the shape. A TypeScript interface is erased at build time, so a
 * backend field that gets renamed or nulled does not fail loudly: it renders
 * as `undefined` somewhere in the UI and the bug is found by a user.
 *
 * Zod closes that gap by making the contract a runtime artifact. Parsing
 * happens once, where data enters the app.
 *
 * Failure policy is deliberate and differs by surface:
 *   - Chrome (the notification bell) degrades to empty. A malformed feed must
 *     never take down the page it decorates.
 *   - Anything the user acted on should surface the error instead.
 * `safeParseOr` expresses the first; use `.parse()` directly for the second.
 *
 * This is the pattern for new boundaries. The existing 27 endpoints are not
 * retrofitted here — that is a deliberate, separately-reviewable change.
 */

import { z } from "zod";

/* ── Notifications ─────────────────────────────────────────────────── */

/** Event kinds the API emits. `catch` keeps an unknown future event
 *  renderable rather than failing the whole feed — a new event type shipped
 *  by the backend must not blank the bell for users on an older bundle. */
export const NotificationEvent = z
  .enum([
    "registration_approved",
    "registration_rejected",
    "snp_allocated",
    "classification_complete",
    "action_needed",
    "announcement",
  ])
  .catch("announcement");

export const NotificationItemSchema = z.object({
  id: z.number().int(),
  event: NotificationEvent,
  title_en: z.string(),
  title_hi: z.string().nullish(),
  body_en: z.string().nullish(),
  body_hi: z.string().nullish(),
  // In-app paths only. A notification is rendered as a click target, so an
  // absolute URL arriving here would be an open redirect on the user's behalf.
  href: z
    .string()
    .nullish()
    .refine((v) => !v || v.startsWith("/"), { message: "href must be in-app" }),
  is_read: z.boolean(),
  created_at: z.string().nullish(),
});

export const NotificationFeedSchema = z.object({
  items: z.array(NotificationItemSchema),
  unread: z.number().int().nonnegative(),
});

export type NotificationItem = z.infer<typeof NotificationItemSchema>;
export type NotificationFeed = z.infer<typeof NotificationFeedSchema>;

/* ── The enterprise behind the signed-in user ──────────────────────── */

export const MeSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  role: z.enum(["mse", "admin"]),
  name: z.string(),
  mse_id: z.number().int().nullish(),
});

export const MyEnterpriseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  status: z.string().nullish(),
  assigned_snp_name: z.string().nullish(),
});

export type Me = z.infer<typeof MeSchema>;

/* ── Helper ────────────────────────────────────────────────────────── */

/** Parse, or fall back — for surfaces where a malformed response must not
 *  break the page. Logs in development so a contract drift is still visible
 *  to whoever is working on it, and stays silent in production. */
export function safeParseOr<T>(
  schema: z.ZodType<T>,
  data: unknown,
  fallback: T,
  label = "response",
): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[schema] ${label} failed validation`, result.error.issues);
  }
  return fallback;
}
