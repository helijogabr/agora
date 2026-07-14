import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, count, db, eq, Likes } from "@/db";
import { sleep } from "./posts/action-delay";

export { createPost } from "./posts/create-post";
export { deletePost } from "./posts/delete-post";
export { getPosts } from "./posts/get-posts";

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
