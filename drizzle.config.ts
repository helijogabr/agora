import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  out: "./db/migrations",
  schema: "./db/schema.ts",
  verbose: true,
  strict: true,
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
    authToken: process.env.DATABASE_TOKEN || "",
  },
});
