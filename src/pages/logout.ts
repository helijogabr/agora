import type { APIRoute } from "astro";

export const POST: APIRoute = ({ cookies, redirect, session }) => {
  session?.destroy();
  cookies.delete("hasCache", { path: "/" });
  cookies.delete("d1-session", { path: "/" });

  const res = redirect("/login");
  return res;
}
