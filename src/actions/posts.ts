import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { db } from "@/db";

export { createPost } from "./posts/create-post";
export { deletePost } from "./posts/delete-post";
export { getPosts } from "./posts/get-posts";
export { likePost } from "./posts/like-post";

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
