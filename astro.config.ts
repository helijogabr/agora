import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { rm } from "fs/promises";
import redisDriver from "./db/kv/driver";
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
    icon(),
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
      DATABASE_URL: {
        context: "server",
        access: "secret",
        type: "string",
      },
      DATABASE_TOKEN: {
        context: "server",
        access: "secret",
        type: "string",
      },
      REDIS_URL: {
        context: "server",
        access: "secret",
        type: "string",
      },
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: "seed-database",
        apply: "serve",
        enforce: "pre",
        async configureServer() {
          if (!import.meta.env.DEV) return;

          await rm("./db/dev.db", { force: true });

          const db = drizzle({
            connection: {
              url: "file:./db/dev.db",
            },
          });

          await migrate(db, { migrationsFolder: "./drizzle" });
          await seed(db);
        },
      },
    ],
  },
  site: "https://todo-astro.vercel.app",
  output: "server",
  adapter: vercel(),
  session: {
    driver: redisDriver(),
  },
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
});
