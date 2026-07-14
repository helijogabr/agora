import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { db } from "@/db";

const POST_LOCATIONS_LIMIT = 500;

export const getPostLocations = defineAction({
  input: z.void(),
  handler: async () => {
    const locations = await db.query.Post.findMany({
      columns: {
        id: true,
        title: true,
        city: true,
        latitude: true,
        longitude: true,
      },
      where: (posts, { and, isNotNull }) =>
        and(isNotNull(posts.latitude), isNotNull(posts.longitude)),
      orderBy: (posts, { desc }) => [desc(posts.updatedAt)],
      limit: POST_LOCATIONS_LIMIT,
    });

    return { locations };
  },
});
