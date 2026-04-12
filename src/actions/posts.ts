import { ActionError, defineAction } from "astro:actions";
import {
  and,
  count,
  db,
  desc,
  eq,
  exists,
  Likes,
  lt,
  Post,
  User,
} from "astro:db";
import { z } from "astro/zod";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getPosts = defineAction({
  input: z.object({
    limit: z.int().nonnegative().max(50).default(10),
    cursor: z
      .union([z.date(), z.iso.datetime()])
      .transform((value) => (value ? new Date(value) : value))
      .nullable()
      .optional(),
  }),
  handler: async ({ cursor, limit }, { locals }) => {
    if (import.meta.env.DEV) {
      await sleep(1000);
    }

    const user = locals.user;

    const posts = await db
      .select({
        id: Post.id,
        title: Post.title,
        content: Post.content,
        createdAt: Post.createdAt,
        updatedAt: Post.updatedAt,
        author: User.name,
        likes: count(Likes.post),
        liked: exists(
          db
            .select()
            .from(Likes)
            .where(and(eq(Likes.user, user.id), eq(Likes.post, Post.id))),
        ).mapWith((exists) => Boolean(+exists)),
      })
      .from(Post)
      .innerJoin(User, eq(Post.author, User.id))
      .leftJoin(Likes, eq(Likes.post, Post.id))
      .where(cursor ? lt(Post.updatedAt, new Date(cursor)) : undefined)
      .orderBy(desc(Post.updatedAt))
      .groupBy(Post.id, User.id)
      .limit(limit + 1);

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

    const res = await db.insert(Post).values({
      title,
      content,
      author: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
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
        : and(eq(Post.id, postId), eq(Post.author, user.id));

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
          user: userId,
          post: postId,
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .then((res) => res.rowsAffected);

      // if changed, post is liked.
      isLiked = res > 0;
    } else {
      await db
        .delete(Likes)
        .where(and(eq(Likes.user, userId), eq(Likes.post, postId)))
        .then((res) => res.rowsAffected);

      // delete fails silently, its never liked
      isLiked = false;
    }

    const res = await db
      .select({ count: count() })
      .from(Likes)
      .where(eq(Likes.post, postId))
      .get();

    return {
      success: true,
      isLiked,
      likes: res?.count ?? 0,
    };
  },
});
