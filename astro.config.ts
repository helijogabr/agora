import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { D1DevSeeder } from "./db/seed_plugin";

// https://astro.build/config
export default defineConfig({
  integrations: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    sitemap(),
  ],
  i18n: {
    defaultLocale: "pt-BR",
    locales: ["pt-BR"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  env: {
    schema: {
      CACHE_VERSION: {
        context: "server",
        access: "public",
        type: "number",
        default: 1,
      },
    },
  },
  vite: {
    resolve: {
      dedupe: ["@astrojs/react", "react", "react-dom", "@tanstack/react-query"],
    },
    ssr: {
      target: "webworker",
      optimizeDeps: {
        include: [
          "drizzle-orm",
          "drizzle-orm/d1",
          "drizzle-orm/sqlite-core",
          "astro/actions/runtime/entrypoints/server.js",
          "astro/virtual-modules/transitions.js",
          "astro/env/runtime",
          "@astrojs/cloudflare/entrypoints/server.js",
          "astro/zod",
          "bcrypt-ts",
        ],
      },
      noExternal: true,
    },
    plugins: [tailwindcss(), D1DevSeeder()],
  },
  site: "https://agora.ame-pistache.workers.dev/",
  output: "server",
  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
  }),
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
});
