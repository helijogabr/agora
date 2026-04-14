import { getActionContext } from "astro:actions";
import { db, eq, User } from "astro:db";
import { CACHE_VERSION } from "astro:env/server";
import { defineMiddleware } from "astro:middleware";
import type { APIContext } from "astro";
import { session } from "./userStore";

const unprotectedPaths = new Set(["/login", "/register"]);

const unprotectedActions = new Set(["createUserForm", "loginForm"]);

const FNV1A_PRIME = 0x01000193;
const FNV1A_OFFSET = 0x811c9dc5;
const FNV1A_MOD = 0x100000000;

function fna1a(
  userId: number,
  timestamp: number,
  locale?: string | undefined,
): string {
  let hash = FNV1A_OFFSET;

  // mix-in cache version
  hash = Math.imul(hash ^ CACHE_VERSION, FNV1A_PRIME);

  // mix-in timestamp, 32 bits at a time
  hash = Math.imul(hash ^ (timestamp >>> 0), FNV1A_PRIME);
  hash = Math.imul(
    hash ^ (Math.floor(timestamp / FNV1A_MOD) >>> 0),
    FNV1A_PRIME,
  );

  // mix-in user ID
  hash = Math.imul(hash ^ (userId >>> 0), FNV1A_PRIME);
  hash = Math.imul(hash ^ (Math.floor(userId / FNV1A_MOD) >>> 0), FNV1A_PRIME);

  if (locale) {
    // mix-in locale string
    for (let j = 0; j < locale.length; j++) {
      hash = Math.imul(hash ^ locale.charCodeAt(j), FNV1A_PRIME);
    }
  }

  return (hash >>> 0).toString(36);
}

function redirect(context: APIContext, isHtml: boolean) {
  if (!isHtml) {
    return new Response("Você precisa estar logado para realizar esta ação.", {
      status: 401,
    });
  }

  context.cookies.delete("hasCache", { path: "/" });
  const returnTo = context.url.pathname.trim();

  if (returnTo && returnTo !== "/" && returnTo !== "/login")
    return context.redirect(`/login?return=${encodeURIComponent(returnTo)}`);

  return context.redirect("/login");
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered || unprotectedPaths.has(context.url.pathname))
    return next();

  const { action } = getActionContext(context);
  if (action && unprotectedActions.has(action.name)) return next();

  const isHtml = {
    get get() {
      const val =
        context.request.method === "GET" &&
        (!action || action.calledFrom === "form") &&
        !context.url.pathname.startsWith("/api/");

      Object.defineProperty(this, "get", { value: val, configurable: true });
      return val;
    },
  };

  let [updatedAt, userId, user] = await Promise.all([
    context.session?.get("updatedAt"),
    context.session?.get("userId"),
    context.session?.get("user"),
  ]);

  if (!userId) return redirect(context, isHtml.get);

  if (!user || !updatedAt) {
    const [dbUser] = await db
      .select({
        name: User.name,
        city: User.city,
        role: User.role,
        updatedAt: User.updatedAt,
      })
      .from(User)
      .where(eq(User.id, userId))
      .limit(1);

    if (!dbUser) {
      context.session?.destroy();
      return redirect(context, isHtml.get);
    }

    updatedAt = dbUser.updatedAt.getTime();
    user = {
      role: dbUser.role ?? undefined,
      name: dbUser.name,
      city: dbUser.city,
    };

    context.session?.set("user", user);
    context.session?.set("updatedAt", updatedAt);
  }

  if (!user || !updatedAt) {
    context.session?.destroy();
    return redirect(context, isHtml.get);
  }

  const locale = context.preferredLocale || context.currentLocale || "pt-BR";

  context.locals.user = {
    id: userId,
    info: {
      locale,
      ...user,
    },
  };

  if (isHtml.get) {
    const cookie = context.cookies.get("hasCache")?.value;
    const hash = fna1a(
      userId,
      updatedAt,
      locale !== "pt-BR" ? locale : undefined,
    );

    if (cookie !== hash) {
      context.locals.invalidateCache = hash;
      if (cookie) context.cookies.delete("hasCache", { path: "/" });
    }
  }

  if (!session) {
    console.warn(
      "Session is not available. User information will not be stored in the session.",
    );
    return next();
  }

  return session.run(context.locals.user.info, () => next());
});
