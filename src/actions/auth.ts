import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db, User } from "../db";

export const createUserForm = defineAction({
  accept: "form",
  input: z.object({
    username: z.string().trim().toLowerCase().nonempty(),
    password: z.string().trim().nonempty(),
    city: z.string().trim().nonempty(),
    redirect: z.string().optional(),
  }),
  handler: async (input, { session, cookies, url }) => {
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
        message: "Nome de usuário já existe. Por favor, escolha outro.",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db.insert(User).values({
      name: username,
      password: hashed,
      city,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!result.lastInsertRowid) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao criar usuário. Por favor, tente novamente.",
      });
    }

    session?.destroy();
    cookies.delete("hasCache", { path: "/" });
    session?.set("userId", Number(result.lastInsertRowid), {
      ttl: 1000 * 60 * 60 * 24, // 1 day
    });

    return {
      success: true,
      redirect: input.redirect || url.searchParams.get("return") || undefined,
    };
  },
});

export const loginForm = defineAction({
  accept: "form",
  input: z.object({
    username: z.string().trim().toLowerCase().nonempty(),
    password: z.string().trim().nonempty(),
    redirect: z.string().optional(),
  }),
  handler: async (input, { session, cookies, url }) => {
    const { username, password } = input;

    cookies.delete("hasCache", { path: "/" });
    session?.destroy();

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

    session?.set("userId", Number(user.id), {
      ttl: 1000 * 60 * 60 * 24, // 1 day
    });

    return {
      success: true,
      role: user.role ?? undefined,
      redirect: input.redirect || url.searchParams.get("return") || undefined,
    };
  },
});

export const whoAmI = defineAction({
  handler: async (_input, { locals }) => {
    return locals.user.info;
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
