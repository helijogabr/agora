import db from "@astrojs/db";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import { dbDriver } from "./db/driver/config";

// https://astro.build/config
export default defineConfig({
  integrations: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    db(),
    sitemap(),
    icon(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://todo-astro.vercel.app",
  output: "server",
  adapter: vercel(),
  session: {
    driver: dbDriver(),
  },
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
});
