import { DATABASE_TOKEN, DATABASE_URL, REDIS_URL } from "astro:env/server";
import { drizzle } from "drizzle-orm/libsql";
import type Redis from "ioredis";
import * as schema from "../db/schema";

export * from "drizzle-orm/sql";
export * from "../db/schema";

console.log("INITIALIZING DATABASE CONNECTIONS...");

export const kv: Redis = import.meta.env.DEV
  ? new (await import("ioredis-mock")).default({ db: 0 })
  : new (await import("ioredis")).default({ host: REDIS_URL, db: 0 });

export const db = drizzle({
  connection: {
    url: import.meta.env.DEV ? "file:./db/dev.db" : DATABASE_URL,
    authToken: DATABASE_TOKEN,
  },
  schema,
});
