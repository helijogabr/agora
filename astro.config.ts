import { readdir } from "node:fs/promises";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import seed from "./db/seed";

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
    ssr: {
      target: "webworker",
    },
    plugins: [
      tailwindcss(),
      {
        name: "seed-database",
        apply: "serve",
        enforce: "pre",
        async configureServer() {
          if (!import.meta.env.DEV) return;

          const basePath = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
          const files = await readdir(basePath);
          const dbFile = files.find(
            (file) => !file.startsWith("metadata") && file.endsWith(".sqlite"),
          );

          const db = drizzle(`file:./${basePath}/${dbFile}`);

          console.log("SEEDING DATABASE...");
          await migrate(db, { migrationsFolder: "./drizzle" });
          await seed(db);
        },
      },
    ],
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
