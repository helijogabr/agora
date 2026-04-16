import bcrypt from "bcrypt";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { seed } from "drizzle-seed";
import * as relations from "./relations";
import * as tables from "./schema";

const schema = { ...tables, ...relations };

function getDateHoursAgo(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() - hours);

  return date;
}

const { User, Post } = schema;

// https://astro.build/db/seed
export async function seeder(db: LibSQLDatabase) {
  await seed(db, schema).refine((f) => ({
    User: {
      columns: {
        name: f.firstName(),
        city: f.city(),
        role: f.weightedRandom([
          {
            weight: 0.1,
            value: f.default({ defaultValue: "admin" }),
          },
          { weight: 0.9, value: f.default({ defaultValue: "user" }) },
        ]),
      },
      count: 20,
    },
    Post: {
      columns: {
        title: f.loremIpsum({ sentencesCount: 1 }),
        content: f.loremIpsum({ sentencesCount: 3 }),
      },
      count: 50,
    },
    Likes: {
      count: 5,
    },
  }));

  await db.insert(User).values([
    {
      id: 128,
      name: "alice",
      password: await bcrypt.hash("123", 10),
      city: "São Paulo",
    },
    {
      id: 256,
      name: "bob",
      password: await bcrypt.hash("456", 10),
      city: "Rio de Janeiro",
    },
  ]);

  await db.insert(Post).values([
    {
      authorId: 128,
      content: "Hello, this is Alice's first post!",
      title: "Alice's First Post",
      createdAt: getDateHoursAgo(4),
      updatedAt: getDateHoursAgo(4),
    },
    {
      authorId: 256,
      content: "Hi, Bob here. This is my first post.",
      title: "Bob's First Post",
      createdAt: getDateHoursAgo(3),
      updatedAt: getDateHoursAgo(3),
    },
  ]);
}
