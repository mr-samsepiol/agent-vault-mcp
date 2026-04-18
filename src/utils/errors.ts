export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PlanNotFoundError extends VaultError {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`);
  }
}

export class PlanValidationError extends VaultError {
  details: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    details: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.details = details;
  }
}

export class StorageError extends VaultError {
  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

export class VersionConflictError extends VaultError {
  constructor(planId: string, expected: number, actual: number) {
    super(
      `Version conflict for plan ${planId}: expected v${expected}, found v${actual}`,
    );
  }
}
