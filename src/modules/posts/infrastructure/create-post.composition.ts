import { CreatePostService } from "../application/services/create-post.service";
import { AstroDbPostRepository } from "./persistence/astro-db-post.repository";
import { createObjectStorageFromEnv } from "@/modules/storage/infrastructure/object-storage.factory";
import { OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2 } from "@/modules/storage/infrastructure/object-storage.config";

export function createPostUseCase() {
  return new CreatePostService(new AstroDbPostRepository(), {
    createObjectStorage: () => createObjectStorageFromEnv(),
    storageProvider: OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2,
  });
}
