import { McpServer } from "@modelcontextprotocol/server";
import type { StorageAdapter } from "../storage/storage-adapter.js";
import { Logger } from "../utils/logger.js";
import { registerAllTools } from "./tools/index.js";

export interface VaultServerOptions {
  storage: StorageAdapter;
  name?: string;
  version?: string;
  logger?: Logger;
}

export function createVaultServer(options: VaultServerOptions): McpServer {
  const logger = options.logger ?? new Logger();

  const server = new McpServer({
    name: options.name ?? "agent-vault-mcp",
    version: options.version ?? "0.1.0",
  });

  registerAllTools(server, options.storage, logger);

  return server;
}
