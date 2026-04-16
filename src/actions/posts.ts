import { ActionError, defineAction } from "astro:actions";
import { waitUntil } from "@vercel/functions";
import { z } from "astro/zod";
import { and, eq, exists } from "drizzle-orm";
import { db, kv, Likes, Post } from "../db";

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

    const { id: userId } = locals.user;

    const now = new Date();

    const res = await db.insert(Post).values({
      title,
      content,
      authorId: userId,
      createdAt: now,
      updatedAt: now,
    });

    const postId = res.lastInsertRowid;

    if (!postId) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao criar post.",
      });
    }

    waitUntil(kv.set(`post:likes:${postId}`, "0", "EX", 60 * 60));
    return { success: true, postId };
  },
});

export const deletePost = defineAction({
  input: z.object({
    postId: z.int().nonnegative(),
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
    postId: z.int().nonnegative(),
    liked: z.boolean(),
  }),
  handler: async ({ postId, liked }, { locals }) => {
    if (import.meta.env.DEV) {
      await sleep(500);
    }

    const TTL = 60 * 60; // 1 hour
    const { id: userId } = locals.user;

    const changedPromise = liked
      ? db
          .insert(Likes)
          .values({
            userId,
            postId,
          })
          .onConflictDoNothing()
          .then((res) => res.rowsAffected > 0)
      : db
          .delete(Likes)
          .where(and(eq(Likes.userId, userId), eq(Likes.postId, postId)))
          .then((res) => res.rowsAffected > 0);

    const likesPromise = kv.get(`post:likes:${postId}`);

    let [changed, likes]: [boolean, string | number | null] = await Promise.all(
      [changedPromise, likesPromise],
    );

    if (likes === null || (Number(likes) <= 0 && changed && !liked)) {
      likes = await db.$count(Likes, eq(Likes.postId, postId));
      await kv.set(`post:likes:${postId}`, String(likes), "EX", TTL, "NX");
    } else if (changed) {
      likes = liked
        ? await kv.incr(`post:likes:${postId}`)
        : await kv.decr(`post:likes:${postId}`);

      waitUntil(kv.expire(`post:likes:${postId}`, TTL));
    }

    return { success: true, isLiked: liked, likes: Math.max(0, Number(likes)) };
  },
});
