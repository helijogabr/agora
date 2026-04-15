import "dotenv/config";
import { readdir } from "node:fs/promises";
import { defineConfig } from "drizzle-kit";

const basePath = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = await readdir(basePath);
const dbFile = files.find(
  (file) => !file.startsWith("metadata") && file.endsWith(".sqlite"),
);

export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./drizzle",
  verbose: true,
  strict: true,
  dbCredentials: {
    url: `file:./${basePath}/${dbFile}`
  },
});
