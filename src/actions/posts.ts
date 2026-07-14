import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, count, db, eq, Likes, Post } from "@/db";
import { validateAttachmentDescriptors } from "@/modules/posts/domain/attachment-policy";
import {
  AttachmentValidationError,
  PostPersistenceError,
} from "@/modules/posts/domain/post-errors";
import { createPostUseCase } from "@/modules/posts/infrastructure/create-post.composition";
import {
  ObjectStorageConfigurationError,
  ObjectStorageOperationError,
} from "@/modules/storage/domain/storage-errors";
import { sleep } from "./posts/action-delay";

export { getPosts } from "./posts/get-posts";

export const createPost = defineAction({
  accept: "form",
  input: z
    .object({
      title: z.string().trim().nonempty(),
      content: z.string().trim().nonempty(),
      postType: z.number().int().positive(),
      tagIds: z.array(z.number().int().positive()).default([]),
      informAddress: z.boolean().default(false),
      zipCode: z.string().trim().optional(),
      city: z.string().trim().optional(),
      district: z.string().trim().optional(),
      street: z.string().trim().optional(),
      number: z.string().trim().optional(),
      attachments: z.array(z.instanceof(File)).default([]),
    })
    .superRefine((value, ctx) => {
      if (!value.informAddress) return;

      const requiredFields = [
        ["zipCode", value.zipCode],
        ["city", value.city],
        ["district", value.district],
        ["street", value.street],
        ["number", value.number],
      ] as const;

      for (const [field, fieldValue] of requiredFields) {
        if (!fieldValue?.trim()) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: "Campo obrigatório quando endereço for informado.",
          });
        }
      }
    }),
  handler: async (input, { locals }) => {
    const user = locals.user;

    if (!user?.id) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "Você precisa estar logado para criar uma publicação.",
      });
    }

    if (import.meta.env.DEV) {
      await sleep(1000);
    }

    try {
      const attachments = await fileListToIncomingAttachments(
        input.attachments ?? [],
      );
      const createPostService = createPostUseCase();

      return await createPostService.execute({
        title: input.title,
        content: input.content,
        authorId: user.id,
        postType: input.postType,
        tagIds: input.tagIds,
        informAddress: input.informAddress,
        zipCode: input.zipCode,
        city: input.city,
        district: input.district,
        street: input.street,
        number: input.number,
        attachments,
      });
    } catch (error) {
      throw mapCreatePostError(error);
    }
  },
});

export const deletePost = defineAction({
  input: z.object({
    postId: z.number().int().positive(),
  }),
  handler: async ({ postId }, { locals }) => {
    if (import.meta.env.DEV) {
      await sleep(500);
    }

    const user = locals.user;

    const where =
      user.info.role === "admin"
        ? eq(Post.id, postId)
        : and(eq(Post.id, postId), eq(Post.authorId, user.id));

    const res = await db
      .delete(Post)
      .where(where)
      .then((res) => res.rowsAffected);

    if (res === 0) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Post not found.",
      });
    }

    return {
      success: true,
    };
  },
});

async function fileListToIncomingAttachments(files: File[]) {
  validateAttachmentDescriptors(
    files.map((file) => ({
      originalName: file.name,
      contentType: file.type,
      size: file.size,
    })),
  );

  return Promise.all(
    files.map(async (file) => ({
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );
}

function mapCreatePostError(error: unknown): ActionError {
  if (error instanceof ActionError) {
    return error;
  }

  if (error instanceof AttachmentValidationError) {
    return new ActionError({
      code: "BAD_REQUEST",
      message: error.issues.join(" "),
    });
  }

  if (error instanceof ObjectStorageConfigurationError) {
    return new ActionError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Armazenamento de anexos não configurado.",
    });
  }

  if (error instanceof ObjectStorageOperationError) {
    return new ActionError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Falha ao armazenar anexos. Tente novamente.",
    });
  }

  if (error instanceof PostPersistenceError) {
    return new ActionError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Falha ao criar post.",
    });
  }

  console.error("Erro inesperado ao criar post.", {
    operation: "createPost",
    errorName: error instanceof Error ? error.name : "UnknownError",
  });

  return new ActionError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Falha ao criar post.",
  });
}

export const likePost = defineAction({
  input: z.object({
    postId: z.number(),
    liked: z.boolean(),
  }),
  handler: async ({ postId, liked }, { locals }) => {
    if (import.meta.env.DEV) {
      await sleep(500);
    }

    const { id: userId } = locals.user;

    let isLiked: boolean;

    if (liked) {
      const res = await db
        .insert(Likes)
        .values({
          userId,
          postId,
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .then((res) => res.rowsAffected);

      // if changed, post is liked.
      isLiked = res > 0;
    } else {
      await db
        .delete(Likes)
        .where(and(eq(Likes.userId, userId), eq(Likes.postId, postId)))
        .then((res) => res.rowsAffected);

      // delete fails silently, its never liked
      isLiked = false;
    }

    const res = await db
      .select({ count: count() })
      .from(Likes)
      .where(eq(Likes.postId, postId))
      .get();

    return {
      success: true,
      isLiked,
      likes: res?.count ?? 0,
    };
  },
});

export const getPostTypes = defineAction({
  input: z.void(),
  handler: async () => {
    const postTypes = await db.query.PostType.findMany();

    return {
      postTypes,
    };
  },
});

export const getTags = defineAction({
  input: z.void(),
  handler: async () => {
    const tags = await db.query.Tag.findMany();

    return {
      tags,
    };
  },
});
