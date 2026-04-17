import { describe, it, expect } from "vitest";
import {
  VaultError,
  PlanNotFoundError,
  PlanValidationError,
  StorageError,
  VersionConflictError,
} from "../../src/utils/errors.js";

describe("VaultError", () => {
  it("should set name from constructor", () => {
    const error = new VaultError("test");
    expect(error.name).toBe("VaultError");
    expect(error.message).toBe("test");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("PlanNotFoundError", () => {
  it("should include plan ID in message", () => {
    const error = new PlanNotFoundError("plan-123");
    expect(error.name).toBe("PlanNotFoundError");
    expect(error.message).toContain("plan-123");
  });
});

describe("PlanValidationError", () => {
  it("should store validation error details", () => {
    const details = [{ path: "goals", message: "required" }];
    const error = new PlanValidationError("validation failed", details);
    expect(error.name).toBe("PlanValidationError");
    expect(error.details).toEqual(details);
  });
});

describe("StorageError", () => {
  it("should wrap cause", () => {
    const cause = new Error("connection refused");
    const error = new StorageError("S3 operation failed", cause);
    expect(error.name).toBe("StorageError");
    expect(error.cause).toBe(cause);
  });
});

describe("VersionConflictError", () => {
  it("should include version info", () => {
    const error = new VersionConflictError("plan-123", 2, 3);
    expect(error.name).toBe("VersionConflictError");
    expect(error.message).toContain("plan-123");
    expect(error.message).toContain("2");
    expect(error.message).toContain("3");
  });
});
