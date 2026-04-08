import { db, Post, User } from "astro:db";

import bcrypt from "bcrypt";

// https://astro.build/db/seed
export default async function seed() {
  await db.insert(User).values([
    {
      name: "alice",
      id: 1,
      password: await bcrypt.hash("123", 10),
    },
    {
      name: "bob",
      id: 2,
      password: await bcrypt.hash("456", 10),
    },
  ]);

  function getDateHoursAgo(hours: number) {
    const date = new Date();
    date.setHours(date.getHours() - hours);

    return date;
  }

  await db.insert(Post).values([
    {
      author: 1,
      content: "Hello, this is Alice's first post!",
      title: "Alice's First Post",
      createdAt: getDateHoursAgo(4),
      updatedAt: getDateHoursAgo(4),
    },
    {
      author: 2,
      content: "Hi, Bob here. This is my first post.",
      title: "Bob's First Post",
      createdAt: getDateHoursAgo(3),
      updatedAt: getDateHoursAgo(3),
    },
    {
      author: 1,
      content: "Alice again! Just wanted to share another post.",
      title: "Alice's Second Post",
      createdAt: getDateHoursAgo(2),
      updatedAt: getDateHoursAgo(2),
    },
    {
      author: 2,
      content: "Bob's back with another post. Hope you like it!",
      title: "Bob's Second Post",
      createdAt: getDateHoursAgo(1),
      updatedAt: getDateHoursAgo(1),
    },
  ]);

  console.log(await db.select().from(User).all());
  console.log(await db.select().from(Post).all());
}
