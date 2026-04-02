import type { SessionDriverConfig } from "astro";

export function dbDriver(): SessionDriverConfig {
  return {
    entrypoint: new URL("./db_sessions", import.meta.url),
    config: {},
  };
}
