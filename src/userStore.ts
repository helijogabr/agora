import type { AsyncLocalStorage } from "node:async_hooks";

type User = {
  name: string;
  city: string;
  role?: string | undefined;
};

const ALS_KEY = Symbol.for("astro.user_session");

async function getSessionStore(): Promise<
  AsyncLocalStorage<App.Locals> | undefined
> {
  if (!import.meta.env.SSR) return undefined;

  const { AsyncLocalStorage } = await import("node:async_hooks");

  if (import.meta.env.DEV) {
    if (!(ALS_KEY in globalThis)) {
      (globalThis as unknown as Record<symbol, AsyncLocalStorage<App.Locals>>)[
        ALS_KEY
      ] = new AsyncLocalStorage<App.Locals>();
    }
    return (
      globalThis as unknown as Record<symbol, AsyncLocalStorage<App.Locals>>
    )[ALS_KEY];
  }

  return new AsyncLocalStorage<App.Locals>();
}

export const session = import.meta.env.SSR
  ? await getSessionStore()
  : undefined;

export function getUser(): User | undefined {
  if (import.meta.env.SSR) {
    return session?.getStore()?.user?.info ?? undefined;
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
