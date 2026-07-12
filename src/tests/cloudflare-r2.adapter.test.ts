import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { ObjectStorageOperationError } from "@/modules/storage/domain/storage-errors";
import {
  type CloudflareR2ClientLike,
  CloudflareR2ObjectStorageAdapter,
} from "@/modules/storage/infrastructure/cloudflare-r2/cloudflare-r2.adapter";

function createClient(send = vi.fn().mockResolvedValue({ ETag: "etag-123" })) {
  return {
    send,
  } satisfies CloudflareR2ClientLike;
}

describe("CloudflareR2ObjectStorageAdapter", () => {
  it("monta PutObjectCommand com bucket, chave, corpo e metadados neutros", async () => {
    const client = createClient();
    const adapter = new CloudflareR2ObjectStorageAdapter(client, {
      bucketName: "test-bucket",
    });
    const body = new Uint8Array([1, 2, 3]);

    const result = await adapter.store({
      key: "post-attachments/batch/object.pdf",
      body,
      contentType: "application/pdf",
      contentLength: body.byteLength,
    });

    expect(result).toEqual({
      key: "post-attachments/batch/object.pdf",
      etag: "etag-123",
    });
    expect(client.send).toHaveBeenCalledTimes(1);
    const command = vi.mocked(client.send).mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command?.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "post-attachments/batch/object.pdf",
      Body: body,
      ContentType: "application/pdf",
      ContentLength: 3,
    });
  });

  it("traduz falha de upload para erro controlado", async () => {
    const client = createClient(vi.fn().mockRejectedValue(new Error("boom")));
    const adapter = new CloudflareR2ObjectStorageAdapter(client, {
      bucketName: "test-bucket",
    });

    await expect(
      adapter.store({
        key: "post-attachments/batch/object.pdf",
        body: new Uint8Array([1]),
        contentType: "application/pdf",
        contentLength: 1,
      }),
    ).rejects.toMatchObject({
      name: "ObjectStorageOperationError",
      operation: "store",
    });
  });

  it("executa GetObjectCommand e retorna bytes da imagem", async () => {
    const body = new Uint8Array([4, 5, 6]);
    const client = createClient(
      vi.fn().mockResolvedValue({
        Body: {
          transformToByteArray: vi.fn().mockResolvedValue(body),
        },
        ContentType: "image/png",
        ContentLength: 3,
      }),
    );
    const adapter = new CloudflareR2ObjectStorageAdapter(client, {
      bucketName: "test-bucket",
    });

    const result = await adapter.get("post-attachments/batch/object.png");

    expect(result).toEqual({
      body,
      contentType: "image/png",
      contentLength: 3,
    });
    const command = vi.mocked(client.send).mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command?.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "post-attachments/batch/object.png",
    });
  });

  it("executa DeleteObjectCommand na remoção", async () => {
    const client = createClient(vi.fn().mockResolvedValue({}));
    const adapter = new CloudflareR2ObjectStorageAdapter(client, {
      bucketName: "test-bucket",
    });

    await adapter.remove("post-attachments/batch/object.pdf");

    const command = vi.mocked(client.send).mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command?.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "post-attachments/batch/object.pdf",
    });
  });

  it("trata objeto inexistente como remoção idempotente", async () => {
    const missingObjectError = new Error("missing");
    missingObjectError.name = "NoSuchKey";
    const client = createClient(vi.fn().mockRejectedValue(missingObjectError));
    const adapter = new CloudflareR2ObjectStorageAdapter(client, {
      bucketName: "test-bucket",
    });

    await expect(
      adapter.remove("post-attachments/batch/object.pdf"),
    ).resolves.toBeUndefined();
  });

  it("traduz falha de remoção para erro controlado", async () => {
    const client = createClient(vi.fn().mockRejectedValue(new Error("boom")));
    const adapter = new CloudflareR2ObjectStorageAdapter(client, {
      bucketName: "test-bucket",
    });

    await expect(
      adapter.remove("post-attachments/batch/object.pdf"),
    ).rejects.toBeInstanceOf(ObjectStorageOperationError);
  });
});
