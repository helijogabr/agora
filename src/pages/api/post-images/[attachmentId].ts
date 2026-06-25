import type { APIRoute } from "astro";
import { db, eq, PostAttachment } from "astro:db";
import { createObjectStorageFromEnv } from "@/modules/storage/infrastructure/object-storage.factory";

export const GET: APIRoute = async ({ params }) => {
  const attachmentId = Number(params.attachmentId);

  if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
    return new Response("Imagem não encontrada.", { status: 404 });
  }

  const attachment = await db
    .select({
      id: PostAttachment.id,
      contentType: PostAttachment.contentType,
      sizeBytes: PostAttachment.sizeBytes,
      storageKey: PostAttachment.storageKey,
    })
    .from(PostAttachment)
    .where(eq(PostAttachment.id, attachmentId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!attachment?.contentType.startsWith("image/")) {
    return new Response("Imagem não encontrada.", { status: 404 });
  }

  try {
    const storage = createObjectStorageFromEnv();
    const object = await storage.get(attachment.storageKey);

    const responseBody = new Uint8Array(object.body).buffer as ArrayBuffer;

    return new Response(responseBody, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(object.contentLength ?? attachment.sizeBytes),
        "Content-Type": object.contentType ?? attachment.contentType,
      },
    });
  } catch (error) {
    console.error("Falha ao carregar imagem de post.", {
      operation: "getPostImage",
      attachmentId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return new Response("Falha ao carregar imagem.", { status: 500 });
  }
};
