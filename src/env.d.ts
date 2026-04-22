declare namespace App {
  type Schema = typeof import("../db/schema");
  type Relations = typeof import("../db/relations").relations;

  interface SessionData {
    userId: number;
  }

  interface Locals {
    userId: number;
    user: {
      name: string;
      city: string;
      role?: "admin" | undefined;
      locale?: string | undefined;
    };
    invalidateCache?: string;
    db: import("drizzle-orm/d1").DrizzleD1Database<Schema, Relations>;
    d1Session?: D1DatabaseSession | null;
  }
}

declare global {
  interface Window {
    __USER__?: {
      name: string;
      city: string;
      role?: "admin" | undefined;
    };
  }
}
