import { rm } from "node:fs/promises";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { reset } from "drizzle-seed";
import type { Plugin } from "vite";
import * as schema from "../schema";
import { seeder } from "../seed";

export default function devSeeder(): Plugin {
  let isSeeded = false;

  return {
    name: "dev-seeder",
    apply: "serve",
    enforce: "pre",
    async configureServer() {
      if (isSeeded || !import.meta.env.DEV) return;
      isSeeded = true;

      await rm("./db/dev.db", { force: true });

      const db = drizzle({
        connection: {
          url: "file:./db/dev.db",
        },
      });

      await migrate(db, { migrationsFolder: "./drizzle" });
      await reset(db, schema);
      await seeder(db);
    },
  };
}
