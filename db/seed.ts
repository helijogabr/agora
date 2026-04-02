import { db, Todo, User } from "astro:db";

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

  await db.insert(Todo).values([
    {
      title: "Buy groceries",
      user: 1,
    },
    {
      title: "Read a book",
      user: 1,
    },
    {
      title: "Go for a run",
      user: 1,
    },
    {
      title: "Walk the dog",
      user: 2,
    },
    {
      title: "Clean the house",
      user: 2,
    },
    {
      title: "Write some code",
      user: 2,
    },
  ]);

  console.log(await db.select().from(User).all());
  console.log(await db.select().from(Todo).all());
}
