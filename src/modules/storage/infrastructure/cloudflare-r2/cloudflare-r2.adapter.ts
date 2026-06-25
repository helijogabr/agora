import {
  DeleteObjectCommand,
  type DeleteObjectCommandOutput,
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  type PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import type {
  GetObjectResult,
  ObjectStoragePort,
  StoreObjectInput,
  StoredObject,
} from "../../application/ports/object-storage.port";
import { ObjectStorageOperationError } from "../../domain/storage-errors";

export interface CloudflareR2AdapterConfig {
  bucketName: string;
}

type CloudflareR2Command =
  | PutObjectCommand
  | GetObjectCommand
  | DeleteObjectCommand;
type CloudflareR2CommandOutput =
  | PutObjectCommandOutput
  | GetObjectCommandOutput
  | DeleteObjectCommandOutput;

export interface CloudflareR2ClientLike {
  send(command: CloudflareR2Command): Promise<CloudflareR2CommandOutput>;
}

export class CloudflareR2ObjectStorageAdapter implements ObjectStoragePort {
  constructor(
    private readonly client: CloudflareR2ClientLike,
    private readonly config: CloudflareR2AdapterConfig,
  ) {}

  async store(input: StoreObjectInput): Promise<StoredObject> {
    try {
      const result = await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucketName,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.contentLength,
          Metadata: input.metadata,
        }),
      );

      const storedObject: StoredObject = {
        key: input.key,
      };

      if ("ETag" in result && result.ETag) {
        storedObject.etag = result.ETag;
      }

      return storedObject;
    } catch (error) {
      throw new ObjectStorageOperationError(
        "store",
        "Falha ao armazenar objeto.",
        { cause: error },
      );
    }
  }

  async get(key: string): Promise<GetObjectResult> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucketName,
          Key: key,
        }),
      );

      if (!("Body" in result) || !result.Body) {
        throw new ObjectStorageOperationError(
          "get",
          "Objeto sem corpo retornado pelo armazenamento.",
        );
      }

      const object: GetObjectResult = {
        body: await result.Body.transformToByteArray(),
      };

      if (result.ContentType) {
        object.contentType = result.ContentType;
      }

      if (result.ContentLength) {
        object.contentLength = result.ContentLength;
      }

      return object;
    } catch (error) {
      if (error instanceof ObjectStorageOperationError) {
        throw error;
      }

      throw new ObjectStorageOperationError("get", "Falha ao ler objeto.", {
        cause: error,
      });
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      if (isMissingObjectError(error)) {
        return;
      }

      throw new ObjectStorageOperationError(
        "remove",
        "Falha ao remover objeto.",
        { cause: error },
      );
    }
  }
}

function isMissingObjectError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "NoSuchKey" || error.name === "NotFound";
}
