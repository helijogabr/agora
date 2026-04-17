import { db, Post, PostType, Tag, User } from "astro:db";

import bcrypt from "bcrypt";

function getDateHoursAgo(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() - hours);

  return date;
}

// https://astro.build/db/seed
export default async function seed() {
  await db.insert(User).values([
    {
      id: 1,
      name: "alice",
      password: await bcrypt.hash("123", 10),
      city: "São Paulo",
      createdAt: getDateHoursAgo(5),
      updatedAt: getDateHoursAgo(4),
    },
    {
      id: 2,
      name: "bob",
      password: await bcrypt.hash("456", 10),
      city: "Rio de Janeiro",
      createdAt: getDateHoursAgo(3),
      updatedAt: getDateHoursAgo(3),
    },
  ]);

  await db.insert(PostType).values([
    {
      id: 1,
      name: "Reclamacao",
    },
    {
      id: 2,
      name: "Sugestao",
    },
    {
      id: 3,
      name: "Denuncia",
    },
    {
      id: 4,
      name: "Elogio",
    },
    {
      id: 5,
      name: "Duvida",
    },
    {
      id: 6,
      name: "Aviso/Comunicado",
    },
  ]);

  await db.insert(Post).values([
    {
      author: 1,
      content: "Hello, this is Alice's first post!",
      title: "Alice's First Post",
      postType: 1,
      zipCode: "01310-100",
      city: "Sao Paulo",
      district: "Bela Vista",
      street: "Avenida Paulista",
      number: "1000",
      createdAt: getDateHoursAgo(4),
      updatedAt: getDateHoursAgo(4),
    },
    {
      author: 2,
      content: "Hi, Bob here. This is my first post.",
      title: "Bob's First Post",
      postType: 2,
      createdAt: getDateHoursAgo(3),
      updatedAt: getDateHoursAgo(3),
    },
    {
      author: 1,
      content: "Alice again! Just wanted to share another post.",
      title: "Alice's Second Post",
      postType: 3,
      zipCode: "20010-000",
      city: "Rio de Janeiro",
      district: "Centro",
      street: "Rua Primeiro de Marco",
      number: "50",
      createdAt: getDateHoursAgo(2),
      updatedAt: getDateHoursAgo(2),
    },
    {
      author: 2,
      content: "Bob's back with another post. Hope you like it!",
      title: "Bob's Second Post",
      postType: 4,
      createdAt: getDateHoursAgo(1),
      updatedAt: getDateHoursAgo(1),
    },
  ]);

  await db.insert(Tag).values([
    {
      id: 1,
      name: "Saúde",
    },
    {
      id: 2,
      name: "Educação",
    },
    {
      id: 3,
      name: "Segurança",
    },
    {
      id: 4,
      name: "Transporte",
    },
    {
      id: 5,
      name: "Meio Ambiente",
    },
  ]);

  console.log(await db.select().from(User).all());
  console.log(await db.select().from(Post).all());
}
