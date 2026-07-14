import bcrypt from "bcrypt";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Post, PostType, Tag, User } from "./schema";

function getDateHoursAgo(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() - hours);

  return date;
}

export default async function seed(db: LibSQLDatabase) {
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

  // Distances below are measured from Av. Paulista, São Paulo
  // (-23.5613, -46.6565) — point your browser's geolocation there
  // (e.g. Chrome DevTools > Sensors > Location) to verify the feed
  // and map order posts from closest to farthest.
  await db.insert(Post).values([
    {
      authorId: 1,
      content: "Hello, this is Alice's first post!",
      title: "Alice's First Post (~300m)",
      postType: 1,
      zipCode: "01310-100",
      city: "Sao Paulo",
      district: "Bela Vista",
      street: "Avenida Paulista",
      number: "1000",
      latitude: -23.5586,
      longitude: -46.6565,
      createdAt: getDateHoursAgo(9),
      updatedAt: getDateHoursAgo(9),
    },
    {
      authorId: 2,
      content: "A um quarteirão dali, bem pertinho.",
      title: "Bob's Nearby Post (~1.2km)",
      postType: 2,
      zipCode: "01302-000",
      city: "Sao Paulo",
      district: "Consolação",
      street: "Rua Augusta",
      number: "500",
      latitude: -23.5505,
      longitude: -46.6565,
      createdAt: getDateHoursAgo(8),
      updatedAt: getDateHoursAgo(8),
    },
    {
      authorId: 1,
      content: "Do outro lado do bairro, um pouco mais longe.",
      title: "Alice's Pinheiros Post (~6km)",
      postType: 3,
      zipCode: "05422-030",
      city: "Sao Paulo",
      district: "Pinheiros",
      street: "Rua dos Pinheiros",
      number: "200",
      latitude: -23.5073,
      longitude: -46.6565,
      createdAt: getDateHoursAgo(7),
      updatedAt: getDateHoursAgo(7),
    },
    {
      authorId: 2,
      content: "Já saindo da capital, região metropolitana.",
      title: "Bob's Guarulhos Post (~25km)",
      postType: 4,
      zipCode: "07090-010",
      city: "Guarulhos",
      district: "Centro",
      street: "Rua Dom Pedro II",
      number: "10",
      latitude: -23.3363,
      longitude: -46.6565,
      createdAt: getDateHoursAgo(6),
      updatedAt: getDateHoursAgo(6),
    },
    {
      authorId: 1,
      content: "Bem mais longe, outra cidade da região.",
      title: "Alice's Campinas Post (~80km)",
      postType: 5,
      zipCode: "13010-141",
      city: "Campinas",
      district: "Centro",
      street: "Avenida Francisco Glicério",
      number: "800",
      latitude: -22.8406,
      longitude: -46.6565,
      createdAt: getDateHoursAgo(5),
      updatedAt: getDateHoursAgo(5),
    },
    {
      authorId: 2,
      content: "Hi, Bob here. This is my first post.",
      title: "Bob's First Post (~360km, Rio)",
      postType: 2,
      zipCode: "20010-000",
      city: "Rio de Janeiro",
      district: "Centro",
      street: "Rua Primeiro de Marco",
      number: "50",
      latitude: -22.9068,
      longitude: -43.1729,
      createdAt: getDateHoursAgo(4),
      updatedAt: getDateHoursAgo(4),
    },
    {
      authorId: 1,
      content: "Alice again! Just wanted to share another post.",
      title: "Alice's Second Post (~360km, Rio)",
      postType: 3,
      zipCode: "20010-000",
      city: "Rio de Janeiro",
      district: "Centro",
      street: "Rua Primeiro de Marco",
      number: "50",
      latitude: -22.9068,
      longitude: -43.1729,
      createdAt: getDateHoursAgo(2),
      updatedAt: getDateHoursAgo(2),
    },
    {
      authorId: 2,
      content: "Bob's back with another post. Hope you like it!",
      title: "Bob's Second Post (no location)",
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
