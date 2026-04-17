#!/usr/bin/env node

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/index.js";
import { S3StorageAdapter } from "./storage/s3-adapter.js";
import { createVaultServer } from "./mcp/server.js";
import { Logger } from "./utils/logger.js";

async function main() {
  const config = loadConfig();
  const logger = new Logger(config.LOG_LEVEL);

  const storage = new S3StorageAdapter({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
    bucket: config.S3_BUCKET,
  });

  const server = createVaultServer({ storage, logger });
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("AgentVault MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
