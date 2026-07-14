import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import {
  and,
  db,
  eq,
  exists,
  gte,
  inArray,
  Likes,
  lte,
  PostTag,
  sql,
} from "@/db";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const POST_DETAIL_COLUMNS = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  zipCode: true,
  city: true,
  district: true,
  street: true,
  number: true,
  latitude: true,
  longitude: true,
} as const;

export const getPosts = defineAction({
  input: z.object({
    limit: z.int().nonnegative().max(50).default(10),
    cursor: z
      .union([z.date(), z.iso.datetime()])
      .transform((value) => (value ? new Date(value) : value))
      .nullable()
      .optional(),
    city: z.string().trim().optional().default(""),
    postTypeIds: z.array(z.number().int().positive()).default([]),
    tagIds: z.array(z.number().int().positive()).default([]),
    startDate: z.string().trim().optional().default(""),
    endDate: z.string().trim().optional().default(""),
  }),
  handler: async (
    { cursor, limit, city, postTypeIds, tagIds, startDate, endDate },
    { locals },
  ) => {
    if (import.meta.env.DEV) {
      await sleep(1000);
    }

    const user = locals.user;

    const posts = await db.query.Post.findMany({
      columns: POST_DETAIL_COLUMNS,
      where: (posts, { and: andCond, lt }) => {
        const conditions = [];

        if (cursor) {
          conditions.push(lt(posts.updatedAt, new Date(cursor)));
        }

        if (city) {
          conditions.push(
            sql`LOWER(${posts.city}) LIKE '%' || LOWER(${city}) || '%'`,
          );
        }

        if (postTypeIds.length > 0) {
          conditions.push(inArray(posts.postType, postTypeIds));
        }

        if (tagIds.length > 0) {
          conditions.push(
            exists(
              db
                .select({ id: PostTag.postId })
                .from(PostTag)
                .where(
                  andCond(
                    eq(PostTag.postId, posts.id),
                    inArray(PostTag.tagId, tagIds),
                  ),
                ),
            ),
          );
        }

        if (startDate) {
          conditions.push(gte(posts.createdAt, new Date(startDate)));
        }

        if (endDate) {
          conditions.push(lte(posts.createdAt, new Date(endDate)));
        }

        return conditions.length ? andCond(...conditions) : undefined;
      },
      orderBy: (posts, { desc }) => [desc(posts.updatedAt)],
      limit: limit + 1,
      with: {
        author: {
          columns: { name: true },
        },
        type: {
          columns: { name: true },
        },
        tags: {
          columns: {},
          with: {
            tag: {
              columns: { name: true, id: true },
            },
          },
        },
        attachments: {
          where: (attachments, { like }) =>
            like(attachments.contentType, "image/%"),
          columns: {
            id: true,
            originalName: true,
            contentType: true,
            sizeBytes: true,
          },
        },
      },
      extras: (table, { sql }) => ({
        likes:
          sql<number>`(SELECT COUNT(*) FROM ${Likes} WHERE ${Likes.postId} = ${table.id})`.as(
            "likes",
          ),
        liked: exists(
          db
            .select({ n: sql`1` })
            .from(Likes)
            .where(and(eq(Likes.userId, user.id), eq(Likes.postId, table.id))),
        )
          .mapWith((exists) => Boolean(+exists))
          .as("liked"),
      }),
    });

    const extra = posts.length > limit ? posts.pop() : undefined;
    const last = posts.at(-1);
    const nextCursor = extra && last?.updatedAt;

    return {
      posts: posts.map(({ attachments, type, ...post }) => ({
        ...post,
        author: post.author.name,
        category: type?.name,
        tags: post.tags.map((tag) => tag.tag.name),
        images: attachments.map((img) => ({
          ...img,
          src: `/api/post-images/${img.id}`,
        })),
      })),
      nextCursor,
    };
  },
});

export const getPost = defineAction({
  input: z.object({
    postId: z.number().int().positive(),
  }),
  handler: async ({ postId }, { locals }) => {
    const user = locals.user;

    const post = await db.query.Post.findFirst({
      columns: POST_DETAIL_COLUMNS,
      where: (posts, { eq }) => eq(posts.id, postId),
      with: {
        author: {
          columns: { name: true },
        },
        type: {
          columns: { name: true },
        },
        tags: {
          columns: {},
          with: {
            tag: {
              columns: { name: true, id: true },
            },
          },
        },
        attachments: {
          where: (attachments, { like }) =>
            like(attachments.contentType, "image/%"),
          columns: {
            id: true,
            originalName: true,
            contentType: true,
            sizeBytes: true,
          },
        },
      },
      extras: (table, { sql }) => ({
        likes:
          sql<number>`(SELECT COUNT(*) FROM ${Likes} WHERE ${Likes.postId} = ${table.id})`.as(
            "likes",
          ),
        liked: exists(
          db
            .select({ n: sql`1` })
            .from(Likes)
            .where(and(eq(Likes.userId, user.id), eq(Likes.postId, table.id))),
        )
          .mapWith((exists) => Boolean(+exists))
          .as("liked"),
      }),
    });

    if (!post) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Post not found.",
      });
    }

    const { attachments, type, ...rest } = post;

    return {
      post: {
        ...rest,
        author: rest.author.name,
        category: type?.name,
        tags: rest.tags.map((tag) => tag.tag.name),
        images: attachments.map((img) => ({
          ...img,
          src: `/api/post-images/${img.id}`,
        })),
      },
    };
  },
});
