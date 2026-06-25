import {
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_ACCOUNT_ID,
  CLOUDFLARE_R2_BUCKET_NAME,
  CLOUDFLARE_R2_ENDPOINT,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  OBJECT_STORAGE_DRIVER,
} from "astro:env/server";
import type { ObjectStoragePort } from "../application/ports/object-storage.port";
import { createCloudflareR2Storage } from "./cloudflare-r2/create-cloudflare-r2-storage";
import {
  OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2,
  resolveObjectStorageConfig,
  type EnvSource,
} from "./object-storage.config";

export function createObjectStorageFromEnv(
  env: EnvSource = readObjectStorageEnv(),
): ObjectStoragePort {
  const config = resolveObjectStorageConfig(env);

  switch (config.driver) {
    case OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2:
      return createCloudflareR2Storage(config);
  }
}

function readObjectStorageEnv(): EnvSource {
  return {
    OBJECT_STORAGE_DRIVER,
    CLOUDFLARE_R2_ENDPOINT,
    CLOUDFLARE_R2_ACCOUNT_ID,
    CLOUDFLARE_R2_ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    CLOUDFLARE_R2_BUCKET_NAME,
  };
}
