import type { SessionDriverConfig } from "astro";

export default function redisDriver(): SessionDriverConfig {
  return {
    entrypoint: new URL("./sessions", import.meta.url),
    config: {},
  };
}
