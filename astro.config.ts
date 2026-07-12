import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import icon from "astro-icon";
import { dbDriver } from "./db/driver/config";
import devSeeder from "./db/plugin_seeder";

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
      CACHE_VERSION: envField.number({
        context: "server",
        access: "public",
        default: 1,
      }),
      DATABASE_URL: envField.string({
        context: "server",
        access: "secret",
        url: true,
      }),
      DATABASE_TOKEN: envField.string({
        context: "server",
        access: "secret",
      }),
      REDIS_URL: envField.string({
        context: "server",
        access: "secret",
        url: true,
      }),
      OBJECT_STORAGE_DRIVER: envField.enum({
        context: "server",
        access: "secret",
        values: ["cloudflare-r2"],
        optional: true,
      }),
      CLOUDFLARE_R2_ENDPOINT: envField.string({
        context: "server",
        access: "secret",
        optional: true,
        url: true,
      }),
      CLOUDFLARE_R2_ACCOUNT_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CLOUDFLARE_R2_ACCESS_KEY_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CLOUDFLARE_R2_BUCKET_NAME: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss(), devSeeder()],
  },
  site: "https://todo-astro.vercel.app",
  output: "server",
  adapter: vercel(),
  session: {
    driver: dbDriver(),
    ttl: 1000 * 60 * 60 * 24
  },
  security: {
    actionBodySizeLimit: 4_500_000,
  },
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
});
