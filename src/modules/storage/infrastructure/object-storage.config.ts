import { ObjectStorageConfigurationError } from "../domain/storage-errors";

export const OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2 = "cloudflare-r2" as const;

export interface EnvSource {
  OBJECT_STORAGE_DRIVER?: string | undefined;
  CLOUDFLARE_R2_ENDPOINT?: string | undefined;
  CLOUDFLARE_R2_ACCOUNT_ID?: string | undefined;
  CLOUDFLARE_R2_ACCESS_KEY_ID?: string | undefined;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY?: string | undefined;
  CLOUDFLARE_R2_BUCKET_NAME?: string | undefined;
}

export interface CloudflareR2StorageConfig {
  driver: typeof OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export type ObjectStorageConfig = CloudflareR2StorageConfig;

export function resolveObjectStorageConfig(
  env: EnvSource,
): ObjectStorageConfig {
  const driver = env.OBJECT_STORAGE_DRIVER;

  if (!driver) {
    throw new ObjectStorageConfigurationError(
      "OBJECT_STORAGE_DRIVER não configurado.",
    );
  }

  if (driver !== OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2) {
    throw new ObjectStorageConfigurationError(
      "Driver de armazenamento de objetos desconhecido.",
    );
  }

  const endpoint =
    normalizeOptionalString(env.CLOUDFLARE_R2_ENDPOINT) ??
    buildCloudflareR2Endpoint(env.CLOUDFLARE_R2_ACCOUNT_ID);
  const accessKeyId = normalizeOptionalString(
    env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  );
  const secretAccessKey = normalizeOptionalString(
    env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  );
  const bucketName = normalizeOptionalString(env.CLOUDFLARE_R2_BUCKET_NAME);

  const missing = [
    ["CLOUDFLARE_R2_ENDPOINT ou CLOUDFLARE_R2_ACCOUNT_ID", endpoint],
    ["CLOUDFLARE_R2_ACCESS_KEY_ID", accessKeyId],
    ["CLOUDFLARE_R2_SECRET_ACCESS_KEY", secretAccessKey],
    ["CLOUDFLARE_R2_BUCKET_NAME", bucketName],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new ObjectStorageConfigurationError(
      `Configuração de armazenamento incompleta: ${missing.join(", ")}.`,
    );
  }

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new ObjectStorageConfigurationError(
      "Configuração de armazenamento incompleta.",
    );
  }

  return {
    driver,
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildCloudflareR2Endpoint(accountId: string | undefined) {
  const normalizedAccountId = normalizeOptionalString(accountId);

  if (!normalizedAccountId) {
    return undefined;
  }

  return `https://${normalizedAccountId}.r2.cloudflarestorage.com`;
}
