import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUserForm, loginForm, logout, whoAmI } from "../actions/auth";
import { withHandler } from "./utils/action-helpers";

type SessionLike = {
  destroy: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

type CookiesLike = {
  delete: ReturnType<typeof vi.fn>;
};

type AuthContext = {
  session: SessionLike;
  cookies: CookiesLike;
  url: URL;
  locals: { user: { info: { id: number; name: string; city: string } } };
};

type CreateUserInput = {
  username: string;
  password: string;
  city: string;
  redirect?: string;
};

type LoginInput = {
  username: string;
  password: string;
  redirect?: string;
};

const SESSION_TTL = 1000 * 60 * 60 * 24;

const createUserFormAction = withHandler<
  typeof createUserForm,
  CreateUserInput,
  AuthContext,
  { success: boolean; redirect: string | undefined }
>(createUserForm);
const loginFormAction = withHandler<
  typeof loginForm,
  LoginInput,
  AuthContext,
  {
    success: boolean;
    role: string | undefined;
    redirect: string | undefined;
  }
>(loginForm);
const whoAmIAction = withHandler<
  typeof whoAmI,
  Record<string, never>,
  AuthContext,
  { id: number; name: string; city: string }
>(whoAmI);
const logoutAction = withHandler<
  typeof logout,
  Record<string, never>,
  AuthContext,
  { success: boolean }
>(logout);

// mocks globais
vi.mock("astro:actions", () => ({
  defineAction: (config: Record<string, unknown>) => config,
  ActionError: class extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  },
}));

const mockDbSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  // biome-ignore lint/suspicious/noThenProperty: <aaa>
  then: vi.fn(),
};

const mockDbInsertChain = {
  values: vi.fn(),
};

vi.mock("astro:db", () => ({
  db: {
    select: vi.fn(() => mockDbSelectChain),
    insert: vi.fn(() => mockDbInsertChain),
  },
  eq: vi.fn(),
  User: {
    id: "id",
    name: "name",
    password: "password",
    city: "city",
    role: "role",
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const getBaseContext = (rawUrl = "http://localhost"): AuthContext => ({
  session: { destroy: vi.fn(), set: vi.fn(), get: vi.fn() },
  cookies: { delete: vi.fn() },
  url: new URL(rawUrl),
  locals: { user: { info: { id: 1, name: "admin", city: "Campinas" } } },
});

// testes
describe("auth.ts actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUserForm", () => {
    it("deve criar um usuário com sucesso e definir a sessão", async () => {
      const context = getBaseContext();
      const input: CreateUserInput = {
        username: "novo_usuario",
        password: "123",
        city: "São Paulo",
      };

      mockDbSelectChain.then.mockResolvedValueOnce(undefined);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce("senha_hasheada" as never);
      mockDbInsertChain.values.mockResolvedValueOnce({ lastInsertRowid: 10 });

      const result = await createUserFormAction.handler(input, context);

      expect(result).toEqual({ success: true, redirect: undefined });
      expect(bcrypt.hash).toHaveBeenCalledWith("123", 10);
      expect(context.session.set).toHaveBeenCalled();
      expect(context.session.set).toHaveBeenCalledWith("userId", 10, {
        ttl: SESSION_TTL,
      });

      const hasUserSessionSet = context.session.set.mock.calls.some(
        (call) =>
          call[0] === "user" &&
          JSON.stringify(call[1]) ===
            JSON.stringify({ name: "novo_usuario", city: "São Paulo" }) &&
          JSON.stringify(call[2]) === JSON.stringify({ ttl: SESSION_TTL }),
      );

      if (context.session.set.mock.calls.length > 1) {
        expect(hasUserSessionSet).toBe(true);
      }
    });

    it("deve priorizar redirect explícito do input", async () => {
      const context = getBaseContext("http://localhost?return=/feed");
      const input: CreateUserInput = {
        username: "novo_usuario_2",
        password: "123",
        city: "São Paulo",
        redirect: "/perfil",
      };

      mockDbSelectChain.then.mockResolvedValueOnce(undefined);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce("senha_hasheada" as never);
      mockDbInsertChain.values.mockResolvedValueOnce({ lastInsertRowid: 11 });

      const result = await createUserFormAction.handler(input, context);

      expect(result).toEqual({ success: true, redirect: "/perfil" });
    });

    it("deve usar redirect do query param quando input não informar redirect", async () => {
      const context = getBaseContext("http://localhost?return=/feed");
      const input: CreateUserInput = {
        username: "novo_usuario_3",
        password: "123",
        city: "São Paulo",
      };

      mockDbSelectChain.then.mockResolvedValueOnce(undefined);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce("senha_hasheada" as never);
      mockDbInsertChain.values.mockResolvedValueOnce({ lastInsertRowid: 12 });

      const result = await createUserFormAction.handler(input, context);

      expect(result).toEqual({ success: true, redirect: "/feed" });
    });

    it("deve lançar erro CONFLICT se o usuário já existir", async () => {
      const context = getBaseContext();
      const input: CreateUserInput = {
        username: "existente",
        password: "123",
        city: "São Paulo",
      };

      mockDbSelectChain.then.mockResolvedValueOnce({
        id: 1,
        name: "existente",
      });

      await expect(
        createUserFormAction.handler(input, context),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Nome de usuário já existe. Por favor, escolha outro.",
      });
    });

    it("deve lançar erro INTERNAL_SERVER_ERROR se a inserção falhar", async () => {
      const context = getBaseContext();
      const input: CreateUserInput = {
        username: "novo",
        password: "123",
        city: "São Paulo",
      };

      mockDbSelectChain.then.mockResolvedValueOnce(undefined);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce("hash" as never);
      mockDbInsertChain.values.mockResolvedValueOnce({});

      await expect(
        createUserFormAction.handler(input, context),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao criar usuário. Por favor, tente novamente.",
      });
    });
  });

  describe("loginForm", () => {
    it("deve logar com sucesso e definir a sessão", async () => {
      const context = getBaseContext();
      const input: LoginInput = { username: "teste", password: "123" };

      mockDbSelectChain.then.mockResolvedValueOnce({
        id: 1,
        name: "teste",
        password: "hash",
        city: "Campinas",
        role: "admin",
      });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await loginFormAction.handler(input, context);

      expect(result).toEqual({
        success: true,
        role: "admin",
        redirect: undefined,
      });
      expect(context.session.set).toHaveBeenCalledWith("userId", 1, {
        ttl: SESSION_TTL,
      });
    });

    it("deve usar redirect do query param quando input não informar redirect", async () => {
      const context = getBaseContext("http://localhost?return=/feed");
      const input: LoginInput = { username: "teste", password: "123" };

      mockDbSelectChain.then.mockResolvedValueOnce({
        id: 1,
        name: "teste",
        password: "hash",
        city: "Campinas",
        role: "admin",
      });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await loginFormAction.handler(input, context);

      expect(result).toEqual({
        success: true,
        role: "admin",
        redirect: "/feed",
      });
    });

    it("deve priorizar redirect explícito no login", async () => {
      const context = getBaseContext("http://localhost?return=/feed");
      const input: LoginInput = {
        username: "teste",
        password: "123",
        redirect: "/perfil",
      };

      mockDbSelectChain.then.mockResolvedValueOnce({
        id: 1,
        name: "teste",
        password: "hash",
        city: "Campinas",
        role: "admin",
      });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await loginFormAction.handler(input, context);

      expect(result).toEqual({
        success: true,
        role: "admin",
        redirect: "/perfil",
      });
    });

    it("deve lançar erro NOT_FOUND se o usuário não for encontrado", async () => {
      const context = getBaseContext();
      const input: LoginInput = { username: "fantasma", password: "123" };

      mockDbSelectChain.then.mockResolvedValueOnce(undefined);

      await expect(
        loginFormAction.handler(input, context),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Cadastre-se para continuar.",
      });
    });

    it("deve lançar erro UNAUTHORIZED se a senha for inválida", async () => {
      const context = getBaseContext();
      const input: LoginInput = { username: "teste", password: "errada" };

      mockDbSelectChain.then.mockResolvedValueOnce({ id: 1, password: "hash" });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      await expect(
        loginFormAction.handler(input, context),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Senha inválida",
      });
    });
  });

  describe("whoAmI", () => {
    it("deve retornar as informações do usuário vindas do locals", async () => {
      const context = getBaseContext();
      const result = await whoAmIAction.handler({}, context);
      expect(result).toEqual({ id: 1, name: "admin", city: "Campinas" });
    });
  });

  describe("logout", () => {
    it("deve destruir a sessão e limpar cookies", async () => {
      const context = getBaseContext();
      context.session.get.mockResolvedValueOnce(undefined);

      const result = await logoutAction.handler({}, context);

      expect(context.session.destroy).toHaveBeenCalled();
      expect(context.cookies.delete).toHaveBeenCalledWith("hasCache", {
        path: "/",
      });
      expect(result.success).toBe(true);
    });

    it("deve retornar success false quando userId ainda existir na sessão em DEV", async () => {
      const context = getBaseContext();
      context.session.get.mockResolvedValueOnce(1);

      const result = await logoutAction.handler({}, context);

      expect(result.success).toBe(false);
    });
  });
});
