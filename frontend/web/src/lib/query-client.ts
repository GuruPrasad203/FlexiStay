import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query client — manages all API data fetching and caching.
 *
 * How it works:
 *  - Every API call is identified by a "query key" e.g. ["hotels", "search", filters]
 *  - Results are cached so the same data isn't fetched twice
 *  - Stale data is refetched automatically in the background
 *
 * Config decisions:
 *  - staleTime 60s  — hotel availability data is valid for 1 minute before refetch
 *  - retry 1        — only retry once on failure (don't hammer the backend)
 *  - refetchOnWindowFocus false — don't refetch when user alt-tabs back
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,        // 60 seconds
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0, // Never retry mutations (booking, payment) — avoid double charges
      },
    },
  });
}

// Browser singleton — one client for the entire app session
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new client (no shared state between requests)
    return makeQueryClient();
  }

  // Browser: reuse the same client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
