import db from "@astrojs/db";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), db()],
  vite: {
    plugins: [tailwindcss()],
  },
});
