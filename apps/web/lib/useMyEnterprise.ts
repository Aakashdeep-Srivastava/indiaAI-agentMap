"use client";

/* Who am I, as an enterprise?
 *
 * The portal's journey pages pass an enterprise around as `?mseId=`, which
 * works for officer flows (they pick a row) but leaves a signed-in owner with
 * no way to refer to their own business. The server already knows — the JWT
 * resolves to a user row carrying `mse_id` — it was just never surfaced past
 * the login redirect.
 *
 * Two chrome components need this at once (the sidebar, to decide whether the
 * certificate has been earned; the notification bell, to know there is a feed
 * at all). TanStack Query dedupes them into one request and shares the result,
 * which is what a hand-rolled module-scope promise cache was approximating
 * before — minus the invalidation story, which that approach did not have.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch, getSession } from "@/lib/auth";
import { queryKeys } from "@/lib/query-provider";
import { MeSchema, MyEnterpriseSchema } from "@/lib/schemas";

export interface MyEnterprise {
  id: number;
  name: string;
  status: string | null;
  assigned_snp_name: string | null;
}

async function fetchMyEnterprise(): Promise<MyEnterprise | null> {
  const meRaw = await apiFetch("/auth/me").then((r) => (r.ok ? r.json() : null));
  // Validated rather than optional-chained: this id decides whether the
  // certificate nav appears, so a wrong shape should fail closed and be loud
  // in development, not silently resolve to `undefined`.
  const me = MeSchema.safeParse(meRaw);
  if (!me.success || !me.data.mse_id) return null;

  const mseRaw = await apiFetch(`/mse/${me.data.mse_id}`).then((r) =>
    r.ok ? r.json() : null,
  );
  const mse = MyEnterpriseSchema.safeParse(mseRaw);
  if (!mse.success) return null;

  return {
    id: mse.data.id,
    name: mse.data.name,
    status: mse.data.status ?? null,
    assigned_snp_name: mse.data.assigned_snp_name ?? null,
  };
}

/** The certificate exists only once an officer has both approved the
 *  enterprise and officially allocated an SNP. Same condition the certificate
 *  page itself uses to decide between the document and the waiting state. */
export function certificateReady(e: MyEnterprise | null | undefined): boolean {
  return !!e && e.status === "approved" && !!e.assigned_snp_name;
}

export function useMyEnterprise(): MyEnterprise | null {
  const { data } = useQuery({
    queryKey: queryKeys.myEnterprise,
    queryFn: fetchMyEnterprise,
    // Only meaningful for a signed-in user; officers have no enterprise.
    enabled: typeof window !== "undefined" && !!getSession(),
    // Allocation status changes rarely and is officer-driven, so this can sit
    // in cache far longer than the notification feed.
    staleTime: 5 * 60_000,
    // Chrome must never break the page it decorates: an unresolved enterprise
    // simply means the optional nav entry stays hidden.
    retry: false,
  });

  return data ?? null;
}
