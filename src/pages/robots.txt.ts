import type { APIRoute } from "astro";

export const prerender = true;

const txt = `\
User-agent: *
Allow: /

Sitemap:`;

export const GET: APIRoute = () => {
  const sitemapUrl = new URL("sitemap-index.xml", import.meta.env.SITE);

  return new Response(`${txt} ${sitemapUrl.href}\n`);
};
