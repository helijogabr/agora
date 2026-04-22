import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, eq, exists, notExists, sql } from "drizzle-orm";
import { Likes, Post } from "../db";

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

    const { db, userId } = locals;

    const posts = await db.query.Post.findMany({
      columns: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        likesCount: true,
      },
      with: {
        author: {
          columns: {
            name: true,
          },
        },
      },
      extras: {
        liked: (t, { sql }) =>
          exists(
            db
              .select({ n: sql`1` })
              .from(Likes)
              .where(and(eq(Likes.userId, userId), eq(Likes.postId, t.id))),
          ).mapWith(Boolean),
      },
      limit,
      where: {
        updatedAt: {
          lt: cursor ?? undefined,
        },
      },
      orderBy: {
        updatedAt: "desc",
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

    const { db, userId } = locals;

    const now = new Date();

    const res = await db.insert(Post).values({
      title,
      content,
      authorId: userId,
      createdAt: now,
      updatedAt: now,
    });

    if (!res.meta.rows_written) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao criar post.",
      });
    }

    return {
      success: true,
      postId: res.meta.last_row_id,
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

    const { db, userId, user } = locals;

    const where =
      user.role === "admin"
        ? eq(Post.id, postId)
        : and(eq(Post.id, postId), eq(Post.authorId, userId));

    const res = await db
      .delete(Post)
      .where(where)
      .then((res) => res.meta.rows_written);

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

    const { db, userId } = locals;

    const hasLike = db
      .select({
        n: sql`1`,
      })
      .from(Likes)
      .where(and(eq(Likes.userId, userId), eq(Likes.postId, postId)));

    const [_, _1, result] = await db.batch([
      db
        .update(Post)
        .set({
          likesCount: sql`(likesCount + ${liked ? 1 : -1})`,
        })
        .where(
          and(
            eq(Post.id, postId),
            liked ? notExists(hasLike) : exists(hasLike),
          ),
        ),
      liked
        ? db.insert(Likes).values({ userId, postId }).onConflictDoNothing()
        : db
            .delete(Likes)
            .where(and(eq(Likes.userId, userId), eq(Likes.postId, postId))),
      db
        .select({
          likesCount: Post.likesCount,
        })
        .from(Post)
        .where(eq(Post.id, postId)),
    ]);

    if (!result?.length) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Post not found.",
      });
    }

    const likes = result[0]?.likesCount ?? 0;

    return {
      success: true,
      isLiked: liked,
      likes,
    };
  },
});
