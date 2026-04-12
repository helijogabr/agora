import { QueryClient } from "@tanstack/react-query";

export const queryClient = import.meta.env.SSR
  ? new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          gcTime: 0,
          enabled: false
        },
      },
    })
  : new QueryClient();
