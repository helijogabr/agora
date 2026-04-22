import { QueryClient } from "@tanstack/react-query";
import { session } from "@/userStore";

export const queryClient = {
  get get() {
    if (import.meta.env.SSR) {
      const store = session?.getStore();
      if (store?.queryClient) {
        return store.queryClient;
      }

      const queryClient = new QueryClient();

      if (store) {
        store.queryClient = queryClient;
      }

      return queryClient;
    }

    let client = (window as unknown as Record<string, QueryClient>)
      .__QUERY_CLIENT__;

    if (!client) {
      client = new QueryClient();
      (window as unknown as Record<string, QueryClient>).__QUERY_CLIENT__ =
        client;
    }

    Object.defineProperty(this, "get", {
      value: client,
      configurable: true,
    });

    return client;
  },
};
