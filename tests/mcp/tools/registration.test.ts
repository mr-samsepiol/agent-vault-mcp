import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/server";
import { registerAllTools } from "../../../src/mcp/tools/index.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { WorkspaceManager } from "../../../src/workspace/workspace-manager.js";

describe("registerAllTools", () => {
  it("should register all tools without errors", () => {
    const server = new McpServer({ name: "test", version: "0.1.0" });
    expect(() => registerAllTools(server, new InMemoryStorageAdapter(), new Logger(), new WorkspaceManager())).not.toThrow();
  });
});
