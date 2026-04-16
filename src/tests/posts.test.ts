import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionError } from 'astro:actions';

import { getPosts, createPost, deletePost, likePost } from '../actions/posts';

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

const mockQueryBuilder: any = {
  __resolveValue: undefined,
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  get: vi.fn(),
  then: vi.fn(function (this: any, callback: any) {
    return Promise.resolve(this.__resolveValue).then(callback);
  }),
};

vi.mock('astro:db', () => ({
  db: {
    select: vi.fn(() => mockQueryBuilder),
    insert: vi.fn(() => mockQueryBuilder),
    delete: vi.fn(() => mockQueryBuilder),
  },

  eq: vi.fn(),
  and: vi.fn(),
  lt: vi.fn(),
  desc: vi.fn(),
  count: vi.fn(() => 'mocked_count'),
  exists: vi.fn(() => ({ mapWith: vi.fn(() => 'mocked_exists') })),

  Post: { id: 'Post.id', title: 'Post.title', content: 'Post.content', createdAt: 'Post.createdAt', updatedAt: 'Post.updatedAt', author: 'Post.author' },
  User: { id: 'User.id', name: 'User.name' },
  Likes: { post: 'Likes.post', user: 'Likes.user', createdAt: 'Likes.createdAt' },
}));

const getBaseContext = (role = 'user') => ({
  locals: {
    user: {
      id: 1,
      info: { role },
    },
  },
});

// testes
describe('posts.ts actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.__resolveValue = undefined;
  });

  describe('getPosts', () => {
    it('deve retornar posts e definir nextCursor se houver itens extras', async () => {
      const d1 = new Date('2024-01-01');
      const d2 = new Date('2024-01-02');
      const d3 = new Date('2024-01-03');

      mockQueryBuilder.__resolveValue = [
        { id: 1, updatedAt: d1 },
        { id: 2, updatedAt: d2 },
        { id: 3, updatedAt: d3 },
      ];

      const result = await getPosts.handler({ limit: 2, cursor: null } as any, getBaseContext() as any);

      expect(result.posts).toHaveLength(2);
      expect(result.posts).toEqual([ { id: 1, updatedAt: d1 }, { id: 2, updatedAt: d2 } ]);
      expect(result.nextCursor).toEqual(d2);
    });

    it('não deve definir nextCursor se retornarem menos ou exatos itens que o limite', async () => {
      mockQueryBuilder.__resolveValue = [
        { id: 1, updatedAt: new Date('2024-01-01') },
      ];

      const result = await getPosts.handler({ limit: 2, cursor: null } as any, getBaseContext() as any);

      expect(result.posts).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe('createPost', () => {
    it('deve criar um post com sucesso e retornar o ID', async () => {
      mockQueryBuilder.__resolveValue = { lastInsertRowid: 42 };

      const result = await createPost.handler({ title: 'Astro Rocks', content: 'Awesome' } as any, getBaseContext() as any);

      expect(result).toEqual({ success: true, postId: 42 });
    });

    it('deve lançar INTERNAL_SERVER_ERROR se não retornar ID de inserção', async () => {
      mockQueryBuilder.__resolveValue = {};

      await expect(
        createPost.handler({ title: 'Fail', content: '...' } as any, getBaseContext() as any)
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
      });
    });
  });

  describe('deletePost', () => {
    it('deve deletar um post com sucesso (user comum ou admin)', async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 1 };

      const result = await deletePost.handler({ postId: 10 } as any, getBaseContext() as any);

      expect(result.success).toBe(true);
    });

    it('deve lançar NOT_FOUND se nenhum post for afetado na exclusão', async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 0 };

      await expect(
        deletePost.handler({ postId: 99 } as any, getBaseContext() as any)
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('likePost', () => {
    it('deve curtir o post e atualizar a contagem', async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 1 };
      mockQueryBuilder.get.mockResolvedValueOnce({ count: 15 });

      const result = await likePost.handler({ postId: 1, liked: true } as any, getBaseContext() as any);

      expect(result).toEqual({ success: true, isLiked: true, likes: 15 });
    });

    it('deve descurtir o post e atualizar a contagem', async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 1 };
      mockQueryBuilder.get.mockResolvedValueOnce({ count: 14 });

      const result = await likePost.handler({ postId: 1, liked: false } as any, getBaseContext() as any);

      expect(result).toEqual({ success: true, isLiked: false, likes: 14 });
    });

    it('deve retornar isLiked false caso onConflictDoNothing seja acionado num curtir repetido', async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 0 };
      mockQueryBuilder.get.mockResolvedValueOnce({ count: 5 });

      const result = await likePost.handler({ postId: 1, liked: true } as any, getBaseContext() as any);

      expect(result).toEqual({ success: true, isLiked: false, likes: 5 });
    });
  });
});
