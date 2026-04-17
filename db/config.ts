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
    postType: column.number({
      references: () => PostType.columns.id,
    }),
    zipCode: column.text({ optional: true }),
    city: column.text({ optional: true }),
    district: column.text({ optional: true }),
    street: column.text({ optional: true }),
    number: column.text({ optional: true }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
});

const PostType = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({
      unique: true,
    }),
  },
});

const PostTag = defineTable({
  columns: {
    post: column.number({
      references: () => Post.columns.id,
    }),
    tag: column.number({
      references: () => Tag.columns.id,
    }),
  },
  indexes: [{ on: ["post", "tag"], unique: true }],
});

const Tag = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({ unique: true }),
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
  tables: { User, Post, PostType, PostTag, Tag, Session, Likes },
});
