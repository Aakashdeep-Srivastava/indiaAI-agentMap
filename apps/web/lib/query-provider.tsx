"use client";

/* Server-state management for the portal.
 *
 * Before this, every component owned its own `useState` + `useEffect` +
 * `fetch` triple. That is fine for one caller and expensive for several: the
 * sidebar and the notification bell both need "which enterprise am I?", so
 * the same request went out twice, cached nowhere, with two hand-rolled
 * lifecycles to keep correct. The bell also polled on a bare `setInterval`,
 * which keeps firing in a background tab and cannot dedupe against a manual
 * refetch.
 *
 * TanStack Query replaces that with one cache keyed by query key: requests
 * dedupe, results are shared, and a mutation can invalidate exactly what it
 * affected. Zod still validates inside each query function — the two are
 * complementary, not alternatives (Query owns *when* data is fetched, Zod
 * owns *whether it is the shape we expected*).
 *
 * Scoped to the portal (`app/(app)`) on purpose. The marketing site is static
 * and server-rendered; wrapping it would ship a client runtime to pages that
 * have no client data at all, for no benefit.
 */

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Query keys in one place so an invalidation cannot silently miss a cache
 *  because a key was retyped slightly differently at the call site. */
export const queryKeys = {
  notifications: ["notifications"] as const,
  myEnterprise: ["my-enterprise"] as const,
};

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Created in state, not at module scope: a module-level client would be
  // shared across requests during SSR and leak one user's cached data into
  // another's render.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // This backend is a single-instance App Service behind a
            // per-minute rate limiter, so the defaults are deliberately
            // calmer than the library's.
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            // A 401 clears the session and redirects (see apiFetch); retrying
            // it would race that redirect and burn rate-limit budget.
            retry: (failureCount, error) =>
              !/session expired/i.test((error as Error)?.message ?? "") &&
              failureCount < 2,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
