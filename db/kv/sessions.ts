import type { SessionDriver } from "astro";
import { kv } from "../../src/db";

export default function (): SessionDriver {
  return {
    async getItem(key) {
      return kv.get(`session:${key}`);
    },
    async setItem(key, value) {
      await kv.set(`session:${key}`, value, "EX", 60 * 60 * 24 * 7);
    },
    async removeItem(key) {
      await kv.del(`session:${key}`);
    },
  };
}
