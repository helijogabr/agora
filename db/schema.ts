import { sql } from "drizzle-orm";
import * as t from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";

export const User = sqliteTable("users", {
  id: t.integer().primaryKey(),
  name: t.text().unique().notNull(),
  password: t.text().notNull(),
  city: t.text().notNull(),
  createdAt: t
    .integer({
      mode: "timestamp",
    })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: t
    .integer({
      mode: "timestamp",
    })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
  role: t.text({
    enum: ["admin"],
  }),
});

export const Post = sqliteTable(
  "posts",
  {
    id: t.integer().primaryKey(),
    title: t.text().notNull(),
    content: t.text().notNull(),
    authorId: t
      .integer()
      .notNull()
      .references(() => User.id, {
        onDelete: "cascade",
      }),
    createdAt: t
      .integer({
        mode: "timestamp",
      })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: t
      .integer({
        mode: "timestamp",
      })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    t.index("author_id_index").on(table.authorId),
    t.index("created_at_index").on(table.updatedAt),
  ],
);

export const Likes = sqliteTable(
  "likes",
  {
    postId: t
      .integer()
      .notNull()
      .references(() => Post.id, {
        onDelete: "cascade",
      }),
    userId: t
      .integer()
      .notNull()
      .references(() => User.id, {
        onDelete: "cascade",
      }),
    createdAt: t
      .integer({
        mode: "timestamp",
      })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [t.uniqueIndex("user_post_unique").on(table.userId, table.postId)],
);
