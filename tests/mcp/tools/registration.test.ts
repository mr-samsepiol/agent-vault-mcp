import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "../../../src/mcp/tools/index.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("registerAllTools", () => {
  it("should register all tools without errors", () => {
    const server = new McpServer({ name: "test", version: "0.1.0" });
    expect(() => registerAllTools(server, new InMemoryStorageAdapter(), new Logger())).not.toThrow();
  });
});
