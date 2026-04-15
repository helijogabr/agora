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

export const Post = sqliteTable("posts", {
  id: t.integer().primaryKey(),
  title: t.text().notNull(),
  content: t.text().notNull(),
  author: t
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
});

export const Likes = sqliteTable(
  "likes",
  {
    post: t
      .integer()
      .notNull()
      .references(() => Post.id, {
        onDelete: "cascade",
      }),
    user: t
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
  (table) => [t.uniqueIndex("user_post_unique").on(table.user, table.post)],
);
