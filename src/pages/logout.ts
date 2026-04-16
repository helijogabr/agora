import type { APIRoute } from "astro";

export const POST: APIRoute = (context) => {
  context.session?.destroy();
  context.cookies.delete("hasCache", { path: "/" });

  return context.redirect("/login");
};
