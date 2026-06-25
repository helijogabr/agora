export interface StoreObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentLength: number;
  metadata?: Record<string, string>;
}

export interface StoredObject {
  key: string;
  etag?: string;
}

export interface GetObjectResult {
  body: Uint8Array;
  contentType?: string;
  contentLength?: number;
}

export interface ObjectStoragePort {
  store(input: StoreObjectInput): Promise<StoredObject>;
  get(key: string): Promise<GetObjectResult>;
  remove(key: string): Promise<void>;
}
