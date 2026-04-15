import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, eq, exists } from "drizzle-orm";
import { db, Likes, Post } from "../db";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getPosts = defineAction({
  input: z.object({
    limit: z.int().nonnegative().max(50).default(10),
    cursor: z
      .union([z.date(), z.iso.datetime()])
      .transform((value) =>
        typeof value === "string" ? new Date(value) : value,
      )
      .nullable()
      .optional(),
  }),
  handler: async ({ cursor, limit }, { locals }) => {
    if (import.meta.env.DEV) {
      await sleep(1000);
    }

    const user = locals.user;

    const posts = await db.query.Post.findMany({
      columns: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        author: {
          columns: {
            name: true,
          },
        },
      },
      extras: {
        likes: (t) => db.$count(Likes, eq(Likes.postId, t.id)),
        liked: (t, { sql }) =>
          exists(
            db
              .select({ n: sql`1` })
              .from(Likes)
              .where(and(eq(Likes.userId, user.id), eq(Likes.postId, t.id))),
          ).mapWith(Boolean),
      },
      limit,
      where: {
        updatedAt: {
          lt: cursor ?? undefined,
        },
      },
    });

    const extra = posts.length > limit ? posts.pop() : undefined;
    const last = posts.at(-1);

    const nextCursor = extra && last?.updatedAt;

    return {
      posts,
      nextCursor,
    };
  },
});

export const createPost = defineAction({
  input: z.object({
    title: z.string().trim().nonempty(),
    content: z.string().trim().nonempty(),
  }),
  handler: async ({ title, content }, { locals }) => {
    if (import.meta.env.DEV) {
      await sleep(1000);
    }

    const { id: userId } = locals.user;

    const now = new Date();

    const res = await db.insert(Post).values({
      title,
      content,
      authorId: userId,
      createdAt: now,
      updatedAt: now,
    });

    if (!res.lastInsertRowid) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao criar post.",
      });
    }

    return {
      success: true,
      postId: res.lastInsertRowid,
    };
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

    const res = await db.$count(Likes, eq(Likes.postId, postId));

    return {
      success: true,
      isLiked,
      likes: res ?? 0,
    };
  },
});
