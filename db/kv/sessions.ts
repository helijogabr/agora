import type { SessionDriver } from "astro";
import { kv } from "../../src/db";

export default function (): SessionDriver {
  return {
    async getItem(key) {
      return kv.get(`astro_session:${key}`);
    },
    async setItem(key, value) {
      await kv.set(`astro_session:${key}`, value);
    },
    async removeItem(key) {
      await kv.del(`astro_session:${key}`);
    },
  };
}
