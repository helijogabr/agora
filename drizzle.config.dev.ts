import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  verbose: true,
  strict: true,
  casing: "snake_case",
  dbCredentials: {
    url: "file:./db/dev.db",
  },
});
