import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const User = sqliteTable("users", {
  id: integer().primaryKey(),
  name: text().notNull().unique(),
  password: text().notNull(),
  city: text().notNull(),
  role: text({ enum: ["admin", "user"] }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const UserRel = relations(User, ({ many }) => ({
  posts: many(Post),
  likes: many(Likes),
}));

export const Post = sqliteTable(
  "posts",
  {
    id: integer().primaryKey(),
    title: text().notNull(),
    content: text().notNull(),
    authorId: integer("author_id")
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    postType: integer("post_type")
      .notNull()
      .references(() => PostType.id, { onDelete: "cascade" }),
    city: text(),
    zipCode: text("zip_code"),
    district: text(),
    street: text(),
    number: text(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("post_authorId_idx").on(t.authorId),
    index("post_postType_idx").on(t.postType),
    index("post_createdAt_idx").on(t.createdAt),
    index("post_updatedAt_idx").on(t.updatedAt),
    index("post_city_idx").on(t.city),
  ],
);

export const PostRel = relations(Post, ({ one, many }) => ({
  author: one(User, {
    fields: [Post.authorId],
    references: [User.id],
  }),
  type: one(PostType, {
    fields: [Post.postType],
    references: [PostType.id],
  }),
  attachments: many(PostAttachment),
  tags: many(PostTag),
}));

export const PostAttachment = sqliteTable(
  "post_attachments",
  {
    id: integer().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => Post.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").unique().notNull(),
    storageProvider: text("storage_provider").notNull(),
    etag: text(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("post_attachment_postId_idx").on(t.postId),
    index("post_attachment_contentType_idx").on(t.contentType),
  ],
);

export const AttachmentRel = relations(PostAttachment, ({ one }) => ({
  post: one(Post, {
    fields: [PostAttachment.postId],
    references: [Post.id],
  }),
}));

export const PostType = sqliteTable("post_types", {
  id: integer().primaryKey(),
  name: text().unique().notNull(),
});

export const PostTypeRel = relations(PostType, ({ many }) => ({
  posts: many(Post),
}));

export const PostTag = sqliteTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => Post.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => Tag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.tagId] }),
    index("post_tag_tagId_idx").on(t.tagId),
    index("post_tag_postId_idx").on(t.postId),
    index("post_tag_postId_tagId_idx").on(t.postId, t.tagId),
  ],
);

export const PostTagRel = relations(PostTag, ({ one }) => ({
  post: one(Post, {
    fields: [PostTag.postId],
    references: [Post.id],
  }),
  tag: one(Tag, {
    fields: [PostTag.tagId],
    references: [Tag.id],
  }),
}));

export const Tag = sqliteTable("tags", {
  id: integer().primaryKey(),
  name: text().unique().notNull(),
});

export const TagRel = relations(Tag, ({ many }) => ({
  posts: many(PostTag),
}));

export const Likes = sqliteTable(
  "likes",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    postId: integer("post_id")
      .notNull()
      .references(() => Post.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    index("likes_postId_idx").on(t.postId),
    index("likes_userId_idx").on(t.userId),
    index("likes_postId_userId_idx").on(t.postId, t.userId),
  ],
);

export const LikesRel = relations(Likes, ({ one }) => ({
  user: one(User, {
    fields: [Likes.userId],
    references: [User.id],
  }),
  post: one(Post, {
    fields: [Likes.postId],
    references: [Post.id],
  }),
}));
