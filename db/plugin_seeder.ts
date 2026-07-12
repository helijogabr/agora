import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { reset } from "drizzle-seed";
import type { Plugin } from "vite";
import * as schema from "./schema";
import seeder from "./seed";

export default function devSeeder(): Plugin {
  let isSeeded = false;

  return {
    name: "dev-seeder",
    apply: "serve",
    enforce: "pre",
    async configureServer() {
      if (isSeeded || !import.meta.env.DEV) return;
      isSeeded = true;

      const db = drizzle({
        connection: {
          url: "file:./db/dev.db",
        }
      });

      await reset(db as LibSQLDatabase, schema);
      await seeder(db);
    },
  };
}
