export class AttachmentValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues[0] ?? "Anexo inválido.");
    this.name = "AttachmentValidationError";
    this.issues = issues;
  }
}

export class PostPersistenceError extends Error {
  constructor(message = "Falha ao persistir post.", options?: ErrorOptions) {
    super(message, options);
    this.name = "PostPersistenceError";
  }
}
