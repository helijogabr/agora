import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  Likes: {
    post: r.one.Post({
      from: r.Likes.postId,
      to: r.Post.id,
      optional: false,
    }),
    user: r.one.User({
      from: r.Likes.userId,
      to: r.User.id,
      optional: false,
    }),
  },
  Post: {
    author: r.one.User({
      from: r.Post.authorId,
      to: r.User.id,
      optional: false,
    }),
    likes: r.many.Likes(),
  },
  User: {
    posts: r.many.Post(),
    likes: r.many.Likes(),
  },
}));
