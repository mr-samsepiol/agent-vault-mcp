import { describe, it, expect } from "vitest";
import { createVaultServer } from "../../../src/mcp/server.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";

describe("createVaultServer", () => {
  it("should create an MCP server instance", () => {
    const storage = new InMemoryStorageAdapter();
    const server = createVaultServer({ storage });
    expect(server).toBeDefined();
  });

  it("should accept custom name and version", () => {
    const storage = new InMemoryStorageAdapter();
    const server = createVaultServer({
      storage,
      name: "custom-vault",
      version: "2.0.0",
    });
    expect(server).toBeDefined();
  });
});
