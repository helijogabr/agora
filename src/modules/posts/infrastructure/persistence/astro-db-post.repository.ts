import { and, db, eq, Post, PostAttachment, PostTag } from "@/db";
import type {
  CreatePostRepositoryInput,
  CreatePostRepositoryResult,
  PostRepositoryPort,
} from "../../application/ports/post-repository.port";
import { PostPersistenceError } from "../../domain/post-errors";

export class AstroDbPostRepository implements PostRepositoryPort {
  async createPostWithAttachments(
    input: CreatePostRepositoryInput,
  ): Promise<CreatePostRepositoryResult> {
    let postId: number | undefined;

    try {
      const createdAt = new Date();
      const result = await db.insert(Post).values({
        title: input.title,
        content: input.content,
        authorId: input.authorId,
        postType: input.postType,
        zipCode: input.address?.zipCode,
        city: input.address?.city,
        district: input.address?.district,
        street: input.address?.street,
        number: input.address?.number,
        createdAt,
        updatedAt: createdAt,
      });

      postId = Number(result.lastInsertRowid);

      if (!postId) {
        throw new PostPersistenceError("Falha ao criar post.");
      }

      const createdPostId = postId;

      if (input.tagIds.length > 0) {
        await db
          .insert(PostTag)
          .values(
            input.tagIds.map((tagId) => ({
              postId: createdPostId,
              tagId,
            })),
          )
          .onConflictDoNothing();
      }

      if (input.attachments.length > 0) {
        await db.insert(PostAttachment).values(
          input.attachments.map((attachment) => ({
            postId: createdPostId,
            originalName: attachment.originalName,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
            storageKey: attachment.storageKey,
            storageProvider: attachment.storageProvider,
            etag: attachment.etag,
            createdAt,
          })),
        );
      }

      return {
        success: true,
        postId,
      };
    } catch (error) {
      if (postId) {
        await this.rollbackCreatedPost(postId, error);
      }

      if (error instanceof PostPersistenceError) {
        throw error;
      }

      throw new PostPersistenceError("Falha ao criar post.", {
        cause: error,
      });
    }
  }

  private async rollbackCreatedPost(
    postId: number,
    primaryError: unknown,
  ): Promise<void> {
    try {
      await db.delete(PostAttachment).where(eq(PostAttachment.postId, postId));
      await db.delete(PostTag).where(eq(PostTag.postId, postId));
      await db.delete(Post).where(and(eq(Post.id, postId)));
    } catch (rollbackError) {
      console.error("Falha ao reverter post após erro de persistência.", {
        operation: "createPost",
        stage: "db-rollback",
        postId,
        primaryErrorName:
          primaryError instanceof Error ? primaryError.name : "UnknownError",
        rollbackErrorName:
          rollbackError instanceof Error ? rollbackError.name : "UnknownError",
      });
    }
  }
}
