import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { relations } from "../db/relations";
import * as schema from "../db/schema";

export * from "../db/schema";

console.log("INITIALIZING DATABASE CONNECTIONS...");

export const kv = env.KV;

export const db = drizzle(env.DB, {
  schema,
  relations,
});
