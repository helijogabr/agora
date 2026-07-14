import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, db, eq, Post } from "@/db";
import { sleep } from "./action-delay";

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
