import { AttachmentValidationError } from "./post-errors";

export const POST_ATTACHMENT_POLICY = {
  maxFiles: 5,
  maxFileSizeBytes: 4 * 1024 * 1024,
  maxTotalSizeBytes: 4 * 1024 * 1024,
  maxOriginalNameLength: 255,
  allowedTypes: {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  },
} as const;

export const POST_ATTACHMENT_ACCEPT = Object.entries(
  POST_ATTACHMENT_POLICY.allowedTypes,
)
  .flatMap(([contentType, extension]) => [contentType, `.${extension}`])
  .join(",");

export type AllowedAttachmentMimeType =
  keyof typeof POST_ATTACHMENT_POLICY.allowedTypes;

export interface AttachmentDescriptor {
  originalName: string;
  contentType: string;
  size: number;
}

export function getAttachmentSafeExtension(contentType: string): string {
  const extension =
    POST_ATTACHMENT_POLICY.allowedTypes[contentType as AllowedAttachmentMimeType];

  if (!extension) {
    throw new AttachmentValidationError([
      "Tipo de arquivo não permitido para anexo.",
    ]);
  }

  return extension;
}

export function sanitizeOriginalAttachmentName(originalName: string): string {
  return originalName
    .trim()
    .replace(/[/\\]+/g, "_")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? "_" : character;
    })
    .join("");
}

export function validateAttachmentDescriptors(
  attachments: AttachmentDescriptor[],
): void {
  const issues: string[] = [];

  if (attachments.length > POST_ATTACHMENT_POLICY.maxFiles) {
    issues.push(
      `Envie no máximo ${POST_ATTACHMENT_POLICY.maxFiles} arquivos por publicação.`,
    );
  }

  let totalSize = 0;

  for (const attachment of attachments) {
    const safeName = sanitizeOriginalAttachmentName(attachment.originalName);
    totalSize += attachment.size;

    if (!safeName) {
      issues.push("Nome do arquivo inválido.");
    }

    if (safeName.length > POST_ATTACHMENT_POLICY.maxOriginalNameLength) {
      issues.push(
        `O nome do arquivo deve ter no máximo ${POST_ATTACHMENT_POLICY.maxOriginalNameLength} caracteres.`,
      );
    }

    if (attachment.size <= 0) {
      issues.push(`O arquivo "${safeName || "sem nome"}" está vazio.`);
    }

    if (attachment.size > POST_ATTACHMENT_POLICY.maxFileSizeBytes) {
      issues.push(
        `O arquivo "${safeName || "sem nome"}" excede o limite por arquivo.`,
      );
    }

    if (
      !Object.hasOwn(POST_ATTACHMENT_POLICY.allowedTypes, attachment.contentType)
    ) {
      issues.push(
        `O arquivo "${safeName || "sem nome"}" possui tipo não permitido.`,
      );
    }
  }

  if (totalSize > POST_ATTACHMENT_POLICY.maxTotalSizeBytes) {
    issues.push("O tamanho total dos anexos excede o limite permitido.");
  }

  if (issues.length > 0) {
    throw new AttachmentValidationError(issues);
  }
}
