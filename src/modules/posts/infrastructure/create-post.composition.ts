import { OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2 } from "@/modules/storage/infrastructure/object-storage.config";
import { createObjectStorageFromEnv } from "@/modules/storage/infrastructure/object-storage.factory";
import { CreatePostService } from "../application/services/create-post.service";
import { NominatimGeocoder } from "./geocoding/nominatim-geocoder";
import { AstroDbPostRepository } from "./persistence/astro-db-post.repository";

export function createPostUseCase() {
  return new CreatePostService(new AstroDbPostRepository(), {
    createObjectStorage: () => createObjectStorageFromEnv(),
    storageProvider: OBJECT_STORAGE_DRIVER_CLOUDFLARE_R2,
    geocoder: new NominatimGeocoder(),
  });
}
