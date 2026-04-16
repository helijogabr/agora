import { db, eq, Session } from "astro:db";
import type { SessionDriver } from "astro";

export default function (_: unknown): SessionDriver {
  return {
    async getItem(key) {
      const sessions = await db
        .select()
        .from(Session)
        .where(eq(Session.key, key))
        .limit(1);

      const session = sessions[0];

      if (!session) {
        return null;
      }

      return session.value;
    },
    async setItem(key, value) {
      await db
        .insert(Session)
        .values({
          key,
          value,
        })
        .onConflictDoUpdate({
          target: Session.key,
          set: {
            value,
          },
        });
    },
    async removeItem(key) {
      await db.delete(Session).where(eq(Session.key, key));
    },
  };
}
