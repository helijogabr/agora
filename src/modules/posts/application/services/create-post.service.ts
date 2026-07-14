import type { ObjectStoragePort } from "@/modules/storage/application/ports/object-storage.port";
import {
  getAttachmentSafeExtension,
  sanitizeOriginalAttachmentName,
  validateAttachmentDescriptors,
} from "../../domain/attachment-policy";
import { PostPersistenceError } from "../../domain/post-errors";
import type { GeocoderPort } from "../ports/geocoder.port";
import type {
  CreatePostRepositoryResult,
  PostRepositoryPort,
} from "../ports/post-repository.port";

export interface IncomingAttachment {
  originalName: string;
  contentType: string;
  size: number;
  bytes: Uint8Array;
}

export interface CreatePostCommand {
  title: string;
  content: string;
  authorId: number;
  postType: number;
  tagIds: number[];
  informAddress: boolean;
  zipCode?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  street?: string | undefined;
  number?: string | undefined;
  shareLocation: boolean;
  latitude?: number | undefined;
  longitude?: number | undefined;
  attachments: IncomingAttachment[];
}

interface CreatePostServiceOptions {
  createObjectStorage: () => ObjectStoragePort;
  storageProvider: string;
  geocoder?: GeocoderPort | undefined;
  generateId?: () => string;
  logger?: Pick<Console, "error">;
}

export class CreatePostService {
  private readonly createObjectStorage: () => ObjectStoragePort;
  private readonly storageProvider: string;
  private readonly geocoder: GeocoderPort | undefined;
  private readonly generateId: () => string;
  private readonly logger: Pick<Console, "error">;

  constructor(
    private readonly postRepository: PostRepositoryPort,
    options: CreatePostServiceOptions,
  ) {
    this.createObjectStorage = options.createObjectStorage;
    this.storageProvider = options.storageProvider;
    this.geocoder = options.geocoder;
    this.generateId = options.generateId ?? (() => crypto.randomUUID());
    this.logger = options.logger ?? console;
  }

  async execute(
    command: CreatePostCommand,
  ): Promise<CreatePostRepositoryResult> {
    validateAttachmentDescriptors(command.attachments);
    this.validateAttachmentBytes(command.attachments);

    const storage =
      command.attachments.length > 0 ? this.createObjectStorage() : undefined;
    const batchId = storage ? this.generateId() : undefined;
    const storedAttachments: Array<{
      originalName: string;
      contentType: string;
      sizeBytes: number;
      storageKey: string;
      storageProvider: string;
      etag?: string | undefined;
    }> = [];

    try {
      for (const attachment of command.attachments) {
        if (!storage || !batchId) break;

        const extension = getAttachmentSafeExtension(attachment.contentType);
        const objectId = this.generateId();
        const key = `post-attachments/${batchId}/${objectId}.${extension}`;
        const storedObject = await storage.store({
          key,
          body: attachment.bytes,
          contentType: attachment.contentType,
          contentLength: attachment.size,
        });

        storedAttachments.push({
          originalName: sanitizeOriginalAttachmentName(attachment.originalName),
          contentType: attachment.contentType,
          sizeBytes: attachment.size,
          storageKey: storedObject.key,
          storageProvider: this.storageProvider,
          etag: storedObject.etag,
        });
      }

      const location =
        command.shareLocation &&
        command.latitude != null &&
        command.longitude != null
          ? { latitude: command.latitude, longitude: command.longitude }
          : command.informAddress
            ? await this.geocodeCommandAddress(command)
            : null;

      return await this.postRepository.createPostWithAttachments({
        title: command.title,
        content: command.content,
        authorId: command.authorId,
        postType: command.postType,
        tagIds: command.tagIds,
        address:
          command.informAddress || command.shareLocation
            ? {
                zipCode: command.zipCode,
                city: command.city,
                district: command.district,
                street: command.street,
                number: command.number,
                latitude: location?.latitude,
                longitude: location?.longitude,
              }
            : undefined,
        attachments: storedAttachments,
      });
    } catch (error) {
      if (storage && storedAttachments.length > 0) {
        await this.removeStoredObjects(storage, storedAttachments, error);
      }

      throw error;
    }
  }

  private async geocodeCommandAddress(command: CreatePostCommand) {
    if (!this.geocoder) return null;

    const addressLine = [
      [command.street, command.number].filter(Boolean).join(", "),
      command.district,
      command.city,
      command.zipCode,
      "Brasil",
    ]
      .filter(Boolean)
      .join(", ");

    return this.geocoder.geocodeAddress(addressLine);
  }

  private validateAttachmentBytes(attachments: IncomingAttachment[]): void {
    const invalidAttachment = attachments.find(
      (attachment) => attachment.bytes.byteLength !== attachment.size,
    );

    if (invalidAttachment) {
      throw new PostPersistenceError("Bytes do anexo inconsistentes.");
    }
  }

  private async removeStoredObjects(
    storage: ObjectStoragePort,
    storedAttachments: Array<{ storageKey: string }>,
    primaryError: unknown,
  ): Promise<void> {
    for (const attachment of storedAttachments) {
      try {
        await storage.remove(attachment.storageKey);
      } catch (compensationError) {
        this.logger.error("Falha ao compensar upload de anexo.", {
          operation: "createPost",
          stage: "storage-compensation",
          primaryErrorName:
            primaryError instanceof Error ? primaryError.name : "UnknownError",
          compensationErrorName:
            compensationError instanceof Error
              ? compensationError.name
              : "UnknownError",
          storageProvider: this.storageProvider,
        });
      }
    }
  }
}
