import { S3Client } from "@aws-sdk/client-s3";
import type { CloudflareR2StorageConfig } from "../object-storage.config";
import { CloudflareR2ObjectStorageAdapter } from "./cloudflare-r2.adapter";

let sharedClient: S3Client | undefined;
let sharedClientSignature: string | undefined;

export function createCloudflareR2Storage(config: CloudflareR2StorageConfig) {
  const signature = [
    config.endpoint,
    config.accessKeyId,
    config.bucketName,
  ].join("|");

  if (!sharedClient || sharedClientSignature !== signature) {
    sharedClient = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    sharedClientSignature = signature;
  }

  return new CloudflareR2ObjectStorageAdapter(sharedClient, {
    bucketName: config.bucketName,
  });
}
