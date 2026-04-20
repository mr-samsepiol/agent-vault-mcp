import { McpServer } from "@modelcontextprotocol/server";
import type { StorageAdapter } from "../storage/storage-adapter.js";
import { Logger } from "../utils/logger.js";
import { WorkspaceManager } from "../workspace/workspace-manager.js";
import { registerAllTools } from "./tools/index.js";

export interface VaultServerOptions {
  storage: StorageAdapter;
  workspaceManager?: WorkspaceManager;
  name?: string;
  version?: string;
  logger?: Logger;
}

export function createVaultServer(options: VaultServerOptions): McpServer {
  const logger = options.logger ?? new Logger();
  const workspaceManager = options.workspaceManager ?? new WorkspaceManager();

  const server = new McpServer({
    name: options.name ?? "agent-vault-mcp",
    version: options.version ?? "0.1.0",
  });

  registerAllTools(server, options.storage, logger, workspaceManager);

  return server;
}
