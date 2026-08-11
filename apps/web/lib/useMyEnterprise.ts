"use client";

/* Who am I, as an enterprise?
 *
 * The portal's journey pages pass an enterprise around as `?mseId=`, which
 * works for officer flows (they pick a row) but leaves a signed-in owner with
 * no way to refer to their own business. The server already knows — the JWT
 * resolves to a user row carrying `mse_id` — it was just never surfaced past
 * the login redirect.
 *
 * This is a thin projection over `useMyMSE()` rather than its own fetch: the
 * sidebar, the notification bell and MSEPicker all ask the same question, and
 * sharing the underlying query keys it to one request for the whole page.
 */

import { useMyMSE } from "@/lib/queries";

export interface MyEnterprise {
  id: number;
  name: string;
  status: string | null;
  assigned_snp_name: string | null;
}

/** The certificate exists only once an officer has both approved the
 *  enterprise and officially allocated an SNP. Same condition the certificate
 *  page itself uses to decide between the document and the waiting state. */
export function certificateReady(e: MyEnterprise | null | undefined): boolean {
  return !!e && e.status === "approved" && !!e.assigned_snp_name;
}

export function useMyEnterprise(): MyEnterprise | null {
  const { data } = useMyMSE();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    status: data.status ?? null,
    assigned_snp_name: data.assigned_snp_name ?? null,
  };
}
