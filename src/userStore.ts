import type { AsyncLocalStorage } from "node:async_hooks";
import type { QueryClient } from "@tanstack/react-query";

type User = App.Locals["user"];

type ALS = AsyncLocalStorage<
  { user: User; queryClient?: QueryClient } | undefined
>;

async function getSessionStore(): Promise<ALS | undefined> {
  if (!import.meta.env.SSR) return undefined;

  const { AsyncLocalStorage } = await import("node:async_hooks");

  if (import.meta.env.DEV) {
    const ALS_KEY = Symbol.for("astro.user_session");

    if (!(ALS_KEY in globalThis)) {
      (globalThis as unknown as Record<symbol, ALS>)[ALS_KEY] =
        new AsyncLocalStorage<{ user: User; queryClient: QueryClient } | undefined>();
    }
    return (globalThis as unknown as Record<symbol, ALS>)[ALS_KEY];
  }

  return new AsyncLocalStorage<{ user: User; queryClient: QueryClient } | undefined>();
}

export const session = import.meta.env.SSR
  ? await getSessionStore()
  : undefined;

export function getUser(): User | undefined {
  if (import.meta.env.SSR) {
    return session?.getStore()?.user ?? undefined;
  }

  let user = (window as unknown as Record<string, unknown>).__USER__;

  if (!user) {
    const userJson = localStorage.getItem("user_cache");
    if (!userJson) {
      cookieStore.delete({
        name: "hasCache",
        path: "/",
      });
      return undefined;
    }

    user = JSON.parse(userJson);
    (window as unknown as Record<string, unknown>).__USER__ = user;
  }

  return user as User | undefined;
}
