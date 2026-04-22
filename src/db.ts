import { env } from "cloudflare:workers";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { relations } from "../db/relations";
import * as schema from "../db/schema";

export * from "../db/schema";

console.log("INITIALIZING DATABASE CONNECTIONS...");

export const kv = env.KV;

export type DB = DrizzleD1Database<typeof schema, typeof relations>;

export const database = {
  defaultSession: null as D1DatabaseSession | null,
  get get(): DB {
    this.defaultSession ??= env.DB.withSession();

    const db = drizzle(this.defaultSession, {
      schema,
      relations,
    });

    Object.defineProperty(this, "get", {
      value: db,
      configurable: false,
      enumerable: false,
      writable: false,
    });


    return db;
  },
  _sessions: new Map<string, [D1DatabaseSession, DB]>(),
  _oldSessions: new Map<string, [D1DatabaseSession, DB]>(),
  withSession(bookmark?: string | undefined) {
    if (!bookmark) {
      return { session: this.defaultSession, db: this.get };
    }

    let cached = this._sessions.get(bookmark);
    if (cached) {
      return { session: cached[0], db: cached[1] };
    }

    cached = this._oldSessions.get(bookmark);
    if (cached) {
      this._sessions.set(bookmark, cached);
      return { session: cached[0], db: cached[1] };
    }

    const session = env.DB.withSession(bookmark);
    const db = drizzle(session, {
      schema,
      relations,
    });

    this._sessions.set(bookmark, [session, db]);

    if (this._sessions.size >= 100) {
      this._oldSessions = this._sessions;
      this._sessions = new Map();
    }

    return { session, db };
  },
};
