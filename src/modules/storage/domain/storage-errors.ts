export class ObjectStorageConfigurationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ObjectStorageConfigurationError";
  }
}

export class ObjectStorageOperationError extends Error {
  readonly operation: "store" | "get" | "remove";

  constructor(
    operation: "store" | "get" | "remove",
    message = "Falha na operação de armazenamento.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ObjectStorageOperationError";
    this.operation = operation;
  }
}
