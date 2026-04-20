import { describe, it, expect } from "vitest";
import {
  VaultError,
  StorageError,
} from "../../src/utils/errors.js";

describe("VaultError", () => {
  it("should set name from constructor", () => {
    const error = new VaultError("test");
    expect(error.name).toBe("VaultError");
    expect(error.message).toBe("test");
    expect(error).toBeInstanceOf(Error);
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
