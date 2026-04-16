import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPost, deletePost, getPosts, likePost } from "../actions/posts";
import { withHandler } from "./utils/action-helpers";

type PostsContext = {
  locals: {
    user: {
      id: number;
      info: { role: string };
    };
  };
};

type GetPostsInput = { limit: number; cursor: Date | string | null };
type CreatePostInput = { title: string; content: string };
type DeletePostInput = { postId: number };
type LikePostInput = { postId: number; liked: boolean };

const getPostsAction = withHandler<
  typeof getPosts,
  GetPostsInput,
  PostsContext,
  {
    posts: Array<{ id: number; updatedAt: Date }>;
    nextCursor?: Date;
  }
>(getPosts);
const createPostAction = withHandler<
  typeof createPost,
  CreatePostInput,
  PostsContext,
  { success: boolean; postId: number }
>(createPost);
const deletePostAction = withHandler<
  typeof deletePost,
  DeletePostInput,
  PostsContext,
  { success: boolean }
>(deletePost);
const likePostAction = withHandler<
  typeof likePost,
  LikePostInput,
  PostsContext,
  { success: boolean; isLiked: boolean; likes: number }
>(likePost);

type QueryBuilderThenCallback = (value: unknown) => unknown;
type MockQueryBuilder = {
  __resolveValue: unknown;
  from: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  onConflictDoNothing: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
};

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

const mockQueryBuilder: MockQueryBuilder = {
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
  then: vi.fn(function (
    this: { __resolveValue: unknown },
    callback: QueryBuilderThenCallback,
  ) {
    return Promise.resolve(this.__resolveValue).then(callback);
  }),
};

vi.mock("astro:db", () => ({
  db: {
    select: vi.fn(() => mockQueryBuilder),
    insert: vi.fn(() => mockQueryBuilder),
    delete: vi.fn(() => mockQueryBuilder),
  },

  eq: vi.fn(),
  and: vi.fn(),
  lt: vi.fn(),
  desc: vi.fn(),
  count: vi.fn(() => "mocked_count"),
  exists: vi.fn(() => ({ mapWith: vi.fn(() => "mocked_exists") })),

  Post: {
    id: "Post.id",
    title: "Post.title",
    content: "Post.content",
    createdAt: "Post.createdAt",
    updatedAt: "Post.updatedAt",
    author: "Post.author",
  },
  User: { id: "User.id", name: "User.name" },
  Likes: {
    post: "Likes.post",
    user: "Likes.user",
    createdAt: "Likes.createdAt",
  },
}));

const getBaseContext = (role = "user"): PostsContext => ({
  locals: {
    user: {
      id: 1,
      info: { role },
    },
  },
});

// testes
describe("posts.ts actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.__resolveValue = undefined;
  });

  describe("getPosts", () => {
    it("deve retornar posts e definir nextCursor se houver itens extras", async () => {
      const d1 = new Date("2024-01-01");
      const d2 = new Date("2024-01-02");
      const d3 = new Date("2024-01-03");

      mockQueryBuilder.__resolveValue = [
        { id: 1, updatedAt: d1 },
        { id: 2, updatedAt: d2 },
        { id: 3, updatedAt: d3 },
      ];

      const input: GetPostsInput = { limit: 2, cursor: null };
      const result = await getPostsAction.handler(input, getBaseContext());

      expect(result.posts).toHaveLength(2);
      expect(result.posts).toEqual([
        { id: 1, updatedAt: d1 },
        { id: 2, updatedAt: d2 },
      ]);
      expect(result.nextCursor).toEqual(d2);
    });

    it("não deve definir nextCursor se retornarem menos ou exatos itens que o limite", async () => {
      mockQueryBuilder.__resolveValue = [
        { id: 1, updatedAt: new Date("2024-01-01") },
      ];

      const input: GetPostsInput = { limit: 2, cursor: null };
      const result = await getPostsAction.handler(input, getBaseContext());

      expect(result.posts).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe("createPost", () => {
    it("deve criar um post com sucesso e retornar o ID", async () => {
      mockQueryBuilder.__resolveValue = { lastInsertRowid: 42 };

      const input: CreatePostInput = {
        title: "Astro Rocks",
        content: "Awesome",
      };
      const result = await createPostAction.handler(input, getBaseContext());

      expect(result).toEqual({ success: true, postId: 42 });
    });

    it("deve lançar INTERNAL_SERVER_ERROR se não retornar ID de inserção", async () => {
      mockQueryBuilder.__resolveValue = {};

      await expect(
        createPostAction.handler(
          { title: "Fail", content: "..." },
          getBaseContext(),
        ),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      });
    });
  });

  describe("deletePost", () => {
    it("deve deletar um post com sucesso para usuário comum", async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 1 };

      const input: DeletePostInput = { postId: 10 };
      const result = await deletePostAction.handler(input, getBaseContext());

      expect(result.success).toBe(true);
    });

    it("deve deletar um post com sucesso para admin", async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 1 };

      const input: DeletePostInput = { postId: 10 };
      const result = await deletePostAction.handler(
        input,
        getBaseContext("admin"),
      );

      expect(result.success).toBe(true);
    });

    it("deve lançar NOT_FOUND se nenhum post for afetado na exclusão", async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 0 };

      await expect(
        deletePostAction.handler({ postId: 99 }, getBaseContext()),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("likePost", () => {
    it("deve curtir o post e atualizar a contagem", async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 1 };
      mockQueryBuilder.get.mockResolvedValueOnce({ count: 15 });

      const input: LikePostInput = { postId: 1, liked: true };
      const result = await likePostAction.handler(input, getBaseContext());

      expect(result).toEqual({ success: true, isLiked: true, likes: 15 });
    });

    it("deve descurtir o post e atualizar a contagem", async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 1 };
      mockQueryBuilder.get.mockResolvedValueOnce({ count: 14 });

      const input: LikePostInput = { postId: 1, liked: false };
      const result = await likePostAction.handler(input, getBaseContext());

      expect(result).toEqual({ success: true, isLiked: false, likes: 14 });
    });

    it("deve retornar isLiked false caso onConflictDoNothing seja acionado num curtir repetido", async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 0 };
      mockQueryBuilder.get.mockResolvedValueOnce({ count: 5 });

      const input: LikePostInput = { postId: 1, liked: true };
      const result = await likePostAction.handler(input, getBaseContext());

      expect(result).toEqual({ success: true, isLiked: false, likes: 5 });
    });

    it("deve retornar likes 0 quando a contagem não for encontrada", async () => {
      mockQueryBuilder.__resolveValue = { rowsAffected: 1 };
      mockQueryBuilder.get.mockResolvedValueOnce(undefined);

      const input: LikePostInput = { postId: 1, liked: true };
      const result = await likePostAction.handler(input, getBaseContext());

      expect(result).toEqual({ success: true, isLiked: true, likes: 0 });
    });
  });
});
