import { column, defineDb, defineTable } from "astro:db";

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({
      unique: true,
    }),
    password: column.text(),
    city: column.text(),
    role: column.text({
      enum: ["admin"],
      optional: true,
    }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
});

const Post = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    content: column.text(),
    author: column.number({
      references: () => User.columns.id,
    }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
});

const Session = defineTable({
  columns: {
    key: column.text({ primaryKey: true }),
    value: column.text({
      optional: true,
    }),
  },
});

const Likes = defineTable({
  columns: {
    user: column.number({
      references: () => User.columns.id,
    }),
    post: column.number({
      references: () => Post.columns.id,
    }),
    createdAt: column.date(),
  },
  indexes: [{ on: ["user", "post"], unique: true }],
});

// https://astro.build/db/config
export default defineDb({
  tables: { User, Post, Session, Likes },
});
