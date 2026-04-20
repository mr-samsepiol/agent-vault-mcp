export class VaultError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VaultError";
  }
}

export class StorageError extends VaultError {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = "StorageError";
  }
}