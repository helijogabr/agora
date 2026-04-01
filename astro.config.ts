import db from "@astrojs/db";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), db(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://todo-astro.vercel.app",
  output: "static",
  adapter: vercel({
    isr: {
      exclude: [/^\/api\//],
    },
  }),
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
});
