import { actions, getActionContext } from "astro:actions";
import { defineMiddleware } from "astro:middleware";
import { session } from "./userStore";

const unprotectedPaths = new Set(["/login", "/register"]);

const unprotectedActions = new Set([
  actions.whoAmI.name,
  actions.createUserForm.name,
  actions.loginForm.name,
  actions.logout.name,
]);

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next();
  }

  if (unprotectedPaths.has(context.url.pathname)) {
    return next();
  }

  const { action } = getActionContext(context);

  if (action && unprotectedActions.has(action.name)) {
    return next();
  }

  const [userId, user] = await Promise.all([
    context.session?.get("userId"),
    context.session?.get("user"),
  ]);

  if (!userId || !user) {
    if (action) {
      throw new Response("You must be logged in to perform this action.", {
        status: 401,
      });
    }

    context.cookies.delete("hasCache", { path: "/" });
    const returnTo = context.url.pathname.trim();

    if (returnTo && returnTo !== "/" && returnTo !== "/login") {
      return context.redirect(`/login?return=${encodeURIComponent(returnTo)}`);
    } else {
      return context.redirect("/login");
    }
  }

  context.locals.user = {
    id: userId,
    info: user
  }

  if (action) {
    return next();
  }

  const cookie = context.cookies.get("hasCache")?.value;

  if (cookie && cookie !== user.name) {
    context.cookies.delete("hasCache", { path: "/" });
  }

  if (!session) {
    console.warn(
      "Session is not available. User information will not be stored in the session.",
    );
    return next();
  }

  return session.run(context.locals, () => next());
});
