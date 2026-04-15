import { DATABASE_TOKEN, DATABASE_URL, REDIS_URL } from "astro:env/server";
import { drizzle } from "drizzle-orm/libsql";

import Redis from "ioredis";
import RedisMock from "ioredis-mock";

console.log("INITIALIZING DATABASE CONNECTIONS...");

export const kv = import.meta.env.DEV
  ? new RedisMock()
  : new Redis(REDIS_URL || "redis://");

export const db = drizzle({
  connection: {
    url: import.meta.env.DEV ? "file:./db/dev.db" : DATABASE_URL,
    authToken: DATABASE_TOKEN,
  },
});

export * from "../db/schema";
