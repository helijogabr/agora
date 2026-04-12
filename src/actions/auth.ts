import { ActionError, defineAction } from "astro:actions";
import { db, eq, User } from "astro:db";
import { z } from "astro/zod";

import bcrypt from "bcrypt";

export const createUserForm = defineAction({
  accept: "form",
  input: z.object({
    username: z.string().trim().toLowerCase().nonempty(),
    password: z.string().trim().nonempty(),
    city: z.string().trim().nonempty(),
  }),
  handler: async (input, { session, url }) => {
    const { username, city, password } = input;

    const existingUser = await db
      .select()
      .from(User)
      .where(eq(User.name, username))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingUser) {
      throw new ActionError({
        code: "CONFLICT",
        message: "Username already exists",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db
      .insert(User)
      .values({ name: username, password: hashed, city });

    if (!result.lastInsertRowid) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create user",
      });
    }

    session?.destroy();
    session?.set("userId", Number(result.lastInsertRowid), {
      ttl: 1000 * 60 * 60 * 24, // 1 day
    });

    session?.set(
      "user",
      {
        name: username,
        city,
      },
      {
        ttl: 1000 * 60 * 60 * 24, // 1 day
      },
    );

    return {
      success: true,
      redirect: url.searchParams.get("return") || undefined,
    };
  },
});

export const loginForm = defineAction({
  accept: "form",
  input: z.object({
    username: z.string().trim().toLowerCase().nonempty(),
    password: z.string().trim().nonempty(),
  }),
  handler: async (input, { session, url }) => {
    const { username, password } = input;

    if (!session) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Session is not available",
      });
    }

    const user = await db
      .select({
        id: User.id,
        name: User.name,
        password: User.password,
        city: User.city,
        role: User.role,
      })
      .from(User)
      .where(eq(User.name, username))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Cadastre-se para continuar.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "Senha inválida",
      });
    }

    session?.destroy();
    session?.set("userId", Number(user.id), {
      ttl: 1000 * 60 * 60 * 24, // 1 day
    });

    session?.set(
      "user",
      {
        name: user.name,
        city: user.city,
        role: user.role ?? undefined,
      },
      {
        ttl: 1000 * 60 * 60 * 24, // 1 day
      },
    );

    return {
      success: true,
      role: user.role ?? undefined,
      redirect: url.searchParams.get("return") || undefined,
    };
  },
});

export const whoAmI = defineAction({
  handler: async (_input, { session }) => {
    const user = await session?.get("user");

    if (!user) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "You are not logged in.",
      });
    }

    return user;
  },
});

export const logout = defineAction({
  handler: async (_input, { session, cookies }) => {
    session?.destroy();
    cookies.delete("hasCache", { path: "/" });

    return {
      success:
        import.meta.env.PROD || (await session?.get("userId")) === undefined,
    };
  },
});
