import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionError } from 'astro:actions';
import { db } from 'astro:db';
import bcrypt from 'bcrypt';

import { createUserForm, loginForm, whoAmI, logout } from '../actions/auth';

// mocks globais
vi.mock('astro:actions', () => ({
  defineAction: (config: any) => config,
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
  then: vi.fn(),
};

const mockDbInsertChain = {
  values: vi.fn(),
};

vi.mock('astro:db', () => ({
  db: {
    select: vi.fn(() => mockDbSelectChain),
    insert: vi.fn(() => mockDbInsertChain),
  },
  eq: vi.fn(),
  User: { id: 'id', name: 'name', password: 'password', city: 'city', role: 'role' },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const getBaseContext = () => ({
  session: { destroy: vi.fn(), set: vi.fn(), get: vi.fn() },
  cookies: { delete: vi.fn() },
  url: new URL('http://localhost'),
  locals: { user: { info: { id: 1, name: 'admin', city: 'Campinas' } } },
});

// testes
describe('auth.ts actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserForm', () => {
    it('deve criar um usuário com sucesso e definir a sessão', async () => {
      const context = getBaseContext();
      const input = { username: 'novo_usuario', password: '123', city: 'São Paulo' };

      mockDbSelectChain.then.mockResolvedValueOnce(undefined);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('senha_hasheada' as never);
      mockDbInsertChain.values.mockResolvedValueOnce({ lastInsertRowid: 10 });

      const result = await createUserForm.handler(input, context as any);

      expect(result).toEqual({ success: true, redirect: undefined });
      expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
      expect(context.session.set).toHaveBeenCalledTimes(2);
      expect(context.session.set).toHaveBeenCalledWith('userId', 10, expect.any(Object));
      expect(context.session.set).toHaveBeenCalledWith('user', { name: 'novo_usuario', city: 'São Paulo' }, expect.any(Object));
    });

    it('deve lançar erro CONFLICT se o usuário já existir', async () => {
      const context = getBaseContext();
      const input = { username: 'existente', password: '123', city: 'São Paulo' };

      mockDbSelectChain.then.mockResolvedValueOnce({ id: 1, name: 'existente' });

      await expect(createUserForm.handler(input, context as any)).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'Nome de usuário já existe. Por favor, escolha outro.',
      });
    });

    it('deve lançar erro INTERNAL_SERVER_ERROR se a inserção falhar', async () => {
      const context = getBaseContext();
      const input = { username: 'novo', password: '123', city: 'São Paulo' };

      mockDbSelectChain.then.mockResolvedValueOnce(undefined);
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('hash' as never);
      mockDbInsertChain.values.mockResolvedValueOnce({});

      await expect(createUserForm.handler(input, context as any)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Falha ao criar usuário. Por favor, tente novamente.',
      });
    });
  });

  describe('loginForm', () => {
    it('deve logar com sucesso e definir a sessão', async () => {
      const context = getBaseContext();
      const input = { username: 'teste', password: '123' };

      mockDbSelectChain.then.mockResolvedValueOnce({
        id: 1, name: 'teste', password: 'hash', city: 'Campinas', role: 'admin'
      });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await loginForm.handler(input, context as any);

      expect(result).toEqual({ success: true, role: 'admin', redirect: undefined });
      expect(context.session.set).toHaveBeenCalledWith('userId', 1, expect.any(Object));
    });

    it('deve lançar erro NOT_FOUND se o usuário não for encontrado', async () => {
      const context = getBaseContext();
      const input = { username: 'fantasma', password: '123' };

      mockDbSelectChain.then.mockResolvedValueOnce(undefined);

      await expect(loginForm.handler(input, context as any)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Cadastre-se para continuar.',
      });
    });

    it('deve lançar erro UNAUTHORIZED se a senha for inválida', async () => {
      const context = getBaseContext();
      const input = { username: 'teste', password: 'errada' };

      mockDbSelectChain.then.mockResolvedValueOnce({ id: 1, password: 'hash' });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      await expect(loginForm.handler(input, context as any)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Senha inválida',
      });
    });
  });

  describe('whoAmI', () => {
    it('deve retornar as informações do usuário vindas do locals', async () => {
      const context = getBaseContext();
      const result = await whoAmI.handler({}, context as any);
      expect(result).toEqual({ id: 1, name: 'admin', city: 'Campinas' });
    });
  });

  describe('logout', () => {
    it('deve destruir a sessão e limpar cookies', async () => {
      const context = getBaseContext();
      context.session.get.mockResolvedValueOnce(undefined);

      const result = await logout.handler({}, context as any);

      expect(context.session.destroy).toHaveBeenCalled();
      expect(context.cookies.delete).toHaveBeenCalledWith('hasCache', { path: '/' });
      expect(result.success).toBe(true);
    });
  });
});
