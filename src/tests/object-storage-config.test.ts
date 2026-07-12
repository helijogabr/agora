import { describe, expect, it } from "vitest";
import { ObjectStorageConfigurationError } from "@/modules/storage/domain/storage-errors";
import {
  OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2,
  resolveObjectStorageConfig,
} from "@/modules/storage/infrastructure/object-storage.config";

describe("object storage config", () => {
  it("resolve configuração Cloudflare R2 completa", () => {
    const config = resolveObjectStorageConfig({
      OBJECT_STORAGE_DRIVER: OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2,
      CLOUDFLARE_R2_ENDPOINT: "https://test-account.r2.cloudflarestorage.com",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "test-access-key",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "test-secret-key",
      CLOUDFLARE_R2_BUCKET_NAME: "test-bucket",
    });

    expect(config).toEqual({
      driver: OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2,
      endpoint: "https://test-account.r2.cloudflarestorage.com",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucketName: "test-bucket",
    });
  });

  it("monta endpoint a partir do account id quando endpoint não foi informado", () => {
    const config = resolveObjectStorageConfig({
      OBJECT_STORAGE_DRIVER: OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2,
      CLOUDFLARE_R2_ACCOUNT_ID: "test-account",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "test-access-key",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "test-secret-key",
      CLOUDFLARE_R2_BUCKET_NAME: "test-bucket",
    });

    expect(config.endpoint).toBe(
      "https://test-account.r2.cloudflarestorage.com",
    );
  });

  it("rejeita driver desconhecido", () => {
    expect(() =>
      resolveObjectStorageConfig({
        OBJECT_STORAGE_DRIVER: "s3",
      }),
    ).toThrow(ObjectStorageConfigurationError);
  });

  it("rejeita configuração ausente", () => {
    expect(() =>
      resolveObjectStorageConfig({
        OBJECT_STORAGE_DRIVER: OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2,
      }),
    ).toThrow(ObjectStorageConfigurationError);
  });
});
