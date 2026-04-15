import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { reset } from "drizzle-seed";
import type { Plugin } from "vite";
import { getPlatformProxy } from "wrangler";
import { relations } from "./relations";
import * as schema from "./schema";
import { seeder } from "./seed";

export function D1DevSeeder(): Plugin {
  let hasSeeded = false;

  return {
    name: "d1-dev-seeder",
    apply: "serve",
    enforce: "pre",
    configureServer: async () => {
      if (!import.meta.env.DEV || hasSeeded) return;
      hasSeeded = true;

      const proxy = await getPlatformProxy({
        persist: true,
      });

      const d1 = proxy.env.DB as D1Database;

      const db = drizzle(d1, {
        schema,
        relations,
      });

      console.log("Running migrations...");
      const folder = new URL("../drizzle", import.meta.url).pathname;
      await migrate(db, { migrationsFolder: folder });

      console.log("Seeding database...");
      await reset(db, schema);
      await seeder(db);

      console.log("Database seeded successfully.");
    },
  };
}
