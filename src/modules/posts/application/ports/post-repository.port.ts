export interface CreatePostAddressInput {
  zipCode?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  street?: string | undefined;
  number?: string | undefined;
}

export interface CreatePostAttachmentMetadata {
  originalName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: string;
  etag?: string | undefined;
}

export interface CreatePostRepositoryInput {
  title: string;
  content: string;
  authorId: number;
  postType: number;
  tagIds: number[];
  address?: CreatePostAddressInput | undefined;
  attachments: CreatePostAttachmentMetadata[];
}

export interface CreatePostRepositoryResult {
  success: true;
  postId: number;
}

export interface PostRepositoryPort {
  createPostWithAttachments(
    input: CreatePostRepositoryInput,
  ): Promise<CreatePostRepositoryResult>;
}
