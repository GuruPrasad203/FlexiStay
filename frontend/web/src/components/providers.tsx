"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";

/**
 * Global providers — wraps the entire app.
 * This is a Client Component ("use client") because React context
 * only works on the client side.
 *
 * Add all context providers here:
 *  - QueryClientProvider  — TanStack Query (API data fetching)
 *  - ReactQueryDevtools   — visible only in development
 *
 * Usage: wrap children in [locale]/layout.tsx with <Providers>
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Shows query inspector panel in dev — hidden in production */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
