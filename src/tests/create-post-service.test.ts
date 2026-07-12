import { describe, expect, it, vi } from "vitest";
import type {
  CreatePostRepositoryInput,
  PostRepositoryPort,
} from "@/modules/posts/application/ports/post-repository.port";
import {
  CreatePostService,
  type IncomingAttachment,
} from "@/modules/posts/application/services/create-post.service";
import {
  AttachmentValidationError,
  PostPersistenceError,
} from "@/modules/posts/domain/post-errors";
import type {
  ObjectStoragePort,
  StoreObjectInput,
} from "@/modules/storage/application/ports/object-storage.port";
import { ObjectStorageOperationError } from "@/modules/storage/domain/storage-errors";

class FakePostRepository implements PostRepositoryPort {
  input?: CreatePostRepositoryInput;
  failWith?: Error;

  async createPostWithAttachments(input: CreatePostRepositoryInput) {
    this.input = input;

    if (this.failWith) {
      throw this.failWith;
    }

    return {
      success: true as const,
      postId: 123,
    };
  }
}

class FakeObjectStorage implements ObjectStoragePort {
  storeCalls = 0;
  removeCalls: string[] = [];
  storedInputs: StoreObjectInput[] = [];
  failStoreAtCall?: number;
  failRemove = false;

  async store(input: StoreObjectInput) {
    this.storeCalls += 1;

    if (this.failStoreAtCall === this.storeCalls) {
      throw new ObjectStorageOperationError("store", "upload failed");
    }

    this.storedInputs.push(input);

    return {
      key: input.key,
      etag: `etag-${this.storeCalls}`,
    };
  }

  async get() {
    return {
      body: new Uint8Array([1]),
      contentType: "image/png",
      contentLength: 1,
    };
  }

  async remove(key: string) {
    if (this.failRemove) {
      throw new ObjectStorageOperationError("remove", "remove failed");
    }

    this.removeCalls.push(key);
  }
}

function createService({
  ids = ["batch-id", "object-id-1", "object-id-2", "object-id-3"],
  repository = new FakePostRepository(),
  storage = new FakeObjectStorage(),
  logger = { error: vi.fn() },
}: {
  ids?: string[];
  repository?: FakePostRepository;
  storage?: FakeObjectStorage;
  logger?: Pick<Console, "error">;
} = {}) {
  const nextIds = [...ids];
  const service = new CreatePostService(repository, {
    createObjectStorage: () => storage,
    storageProvider: "cloudflare-r2",
    generateId: () => nextIds.shift() ?? "fallback-id",
    logger,
  });

  return { service, repository, storage, logger };
}

function baseCommand(attachments: IncomingAttachment[] = []) {
  return {
    title: "Post com anexo",
    content: "Conteudo",
    authorId: 1,
    postType: 1,
    tagIds: [1, 2],
    informAddress: false,
    attachments,
  };
}

function attachment(
  overrides: Partial<IncomingAttachment> = {},
): IncomingAttachment {
  const bytes = overrides.bytes ?? new Uint8Array([1, 2, 3]);

  return {
    originalName: "arquivo.png",
    contentType: "image/png",
    size: bytes.byteLength,
    bytes,
    ...overrides,
  };
}

describe("CreatePostService", () => {
  it("cria post sem anexos sem acionar armazenamento", async () => {
    const { service, repository, storage } = createService();

    const result = await service.execute(baseCommand());

    expect(result).toEqual({ success: true, postId: 123 });
    expect(storage.storeCalls).toBe(0);
    expect(repository.input?.attachments).toEqual([]);
  });

  it("cria post com um arquivo valido", async () => {
    const file = attachment();
    const { service, repository, storage } = createService();

    await service.execute(baseCommand([file]));

    expect(storage.storedInputs).toHaveLength(1);
    expect(repository.input?.attachments).toEqual([
      {
        originalName: "arquivo.png",
        contentType: "image/png",
        sizeBytes: 3,
        storageKey: "post-attachments/batch-id/object-id-1.png",
        storageProvider: "cloudflare-r2",
        etag: "etag-1",
      },
    ]);
  });

  it("cria post com vários arquivos válidos e chaves únicas", async () => {
    const { service, repository, storage } = createService();

    await service.execute(
      baseCommand([
        attachment({ originalName: "a.png", contentType: "image/png" }),
        attachment({ originalName: "b.webp", contentType: "image/webp" }),
      ]),
    );

    expect(storage.storedInputs.map((input) => input.key)).toEqual([
      "post-attachments/batch-id/object-id-1.png",
      "post-attachments/batch-id/object-id-2.webp",
    ]);
    expect(new Set(storage.storedInputs.map((input) => input.key)).size).toBe(
      2,
    );
    expect(repository.input?.attachments).toHaveLength(2);
  });

  it("envia bytes, MIME type e tamanho corretos para a porta", async () => {
    const bytes = new Uint8Array([9, 8, 7, 6]);
    const { service, storage } = createService();

    await service.execute(
      baseCommand([
        attachment({
          originalName: "imagem.jpg",
          contentType: "image/jpeg",
          bytes,
          size: bytes.byteLength,
        }),
      ]),
    );

    expect(storage.storedInputs[0]).toMatchObject({
      body: bytes,
      contentType: "image/jpeg",
      contentLength: 4,
    });
  });

  it("não usa o nome original para montar caminho nem permite path traversal", async () => {
    const { service, repository, storage } = createService();

    await service.execute(
      baseCommand([attachment({ originalName: "../../a.png" })]),
    );

    expect(storage.storedInputs[0]?.key).toBe(
      "post-attachments/batch-id/object-id-1.png",
    );
    expect(storage.storedInputs[0]?.key).not.toContain("..");
    expect(repository.input?.attachments[0]?.originalName).toBe(".._.._a.png");
  });

  it("rejeita arquivo vazio antes de upload", async () => {
    const { service, storage, repository } = createService();

    await expect(
      service.execute(
        baseCommand([attachment({ bytes: new Uint8Array(), size: 0 })]),
      ),
    ).rejects.toBeInstanceOf(AttachmentValidationError);

    expect(storage.storeCalls).toBe(0);
    expect(repository.input).toBeUndefined();
  });

  it("rejeita MIME type não permitido antes de upload", async () => {
    const { service, storage, repository } = createService();

    await expect(
      service.execute(baseCommand([attachment({ contentType: "text/html" })])),
    ).rejects.toBeInstanceOf(AttachmentValidationError);

    expect(storage.storeCalls).toBe(0);
    expect(repository.input).toBeUndefined();
  });

  it("rejeita arquivo acima do limite antes de upload", async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
    const { service, storage, repository } = createService();

    await expect(
      service.execute(baseCommand([attachment({ bytes, size: bytes.length })])),
    ).rejects.toBeInstanceOf(AttachmentValidationError);

    expect(storage.storeCalls).toBe(0);
    expect(repository.input).toBeUndefined();
  });

  it("rejeita quantidade acima do limite antes de upload", async () => {
    const { service, storage, repository } = createService();

    await expect(
      service.execute(
        baseCommand(
          Array.from({ length: 6 }, (_, index) =>
            attachment({
              originalName: `arquivo-${index}.png`,
            }),
          ),
        ),
      ),
    ).rejects.toBeInstanceOf(AttachmentValidationError);

    expect(storage.storeCalls).toBe(0);
    expect(repository.input).toBeUndefined();
  });

  it("rejeita tamanho total acima do limite antes de upload", async () => {
    const bytes = new Uint8Array(4 * 1024 * 1024);
    const { service, storage, repository } = createService();

    await expect(
      service.execute(
        baseCommand(
          Array.from({ length: 4 }, (_, index) =>
            attachment({
              originalName: `arquivo-${index}.pdf`,
              contentType: "image/png",
              bytes,
              size: bytes.length,
            }),
          ),
        ),
      ),
    ).rejects.toBeInstanceOf(AttachmentValidationError);

    expect(storage.storeCalls).toBe(0);
    expect(repository.input).toBeUndefined();
  });

  it("falha no primeiro upload não persiste o post", async () => {
    const storage = new FakeObjectStorage();
    storage.failStoreAtCall = 1;
    const { service, repository } = createService({ storage });

    await expect(
      service.execute(baseCommand([attachment()])),
    ).rejects.toBeInstanceOf(ObjectStorageOperationError);

    expect(repository.input).toBeUndefined();
  });

  it("falha depois de um upload bem sucedido remove o objeto anterior", async () => {
    const storage = new FakeObjectStorage();
    storage.failStoreAtCall = 2;
    const { service, repository } = createService({ storage });

    await expect(
      service.execute(baseCommand([attachment(), attachment()])),
    ).rejects.toBeInstanceOf(ObjectStorageOperationError);

    expect(repository.input).toBeUndefined();
    expect(storage.removeCalls).toEqual([
      "post-attachments/batch-id/object-id-1.png",
    ]);
  });

  it("falha na persistência remove todos os objetos enviados", async () => {
    const repository = new FakePostRepository();
    repository.failWith = new PostPersistenceError("db failed");
    const { service, storage } = createService({ repository });

    await expect(
      service.execute(baseCommand([attachment(), attachment()])),
    ).rejects.toBe(repository.failWith);

    expect(storage.removeCalls).toEqual([
      "post-attachments/batch-id/object-id-1.png",
      "post-attachments/batch-id/object-id-2.png",
    ]);
  });

  it("falha de compensação não mascara a causa principal e registra log", async () => {
    const repository = new FakePostRepository();
    repository.failWith = new PostPersistenceError("db failed");
    const storage = new FakeObjectStorage();
    storage.failRemove = true;
    const logger = { error: vi.fn() };
    const { service } = createService({ repository, storage, logger });

    await expect(service.execute(baseCommand([attachment()]))).rejects.toBe(
      repository.failWith,
    );

    expect(logger.error).toHaveBeenCalledWith(
      "Falha ao compensar upload de anexo.",
      expect.objectContaining({
        operation: "createPost",
        stage: "storage-compensation",
        storageProvider: "cloudflare-r2",
      }),
    );
  });

  it("não retorna chave de storage, bucket ou endpoint ao cliente", async () => {
    const { service } = createService();

    const result = await service.execute(baseCommand([attachment()]));

    expect(result).toEqual({ success: true, postId: 123 });
    expect(JSON.stringify(result)).not.toContain("post-attachments");
    expect(JSON.stringify(result)).not.toContain("bucket");
    expect(JSON.stringify(result)).not.toContain("endpoint");
  });
});
