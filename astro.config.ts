import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import devSeeder from "./db/kv/dev_seeder";
import redisDriver from "./db/kv/driver";

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
    plugins: [tailwindcss(), devSeeder()],
  },
  site: "https://todo-astro.vercel.app",
  output: "server",
  adapter: vercel(),
  session: {
    driver: redisDriver(),
    cookie: "session",
    ttl: 60 * 60 * 24 * 7, // 7 days
  },
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
});
