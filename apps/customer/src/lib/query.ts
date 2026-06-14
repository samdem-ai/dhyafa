/**
 * Shared TanStack Query client for the customer app.
 *
 * Mounted once at the root (`app/_layout.tsx` via <QueryClientProvider>). Screens
 * use `useQuery`/`useMutation` against this client so remote data is cached,
 * deduped, and refreshed with a uniform stale-while-revalidate policy — replacing
 * the per-screen `useFocusEffect` refetch storms.
 *
 * Defaults are tuned for a mobile booking app: keep data fresh enough to feel
 * live, but avoid hammering the network on every focus.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Treat data as fresh for 1 min; serve cached + revalidate after.
      staleTime: 60_000,
      // Keep unused data around for 5 min before garbage collection.
      gcTime: 5 * 60_000,
      retry: 1,
      // RN has no window focus; rely on explicit refetch / pull-to-refresh.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
