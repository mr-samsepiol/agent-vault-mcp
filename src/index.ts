#!/usr/bin/env node

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/server";
import { loadConfig } from "./config/index.js";
import { S3StorageAdapter } from "./storage/s3-adapter.js";
import { createVaultServer } from "./mcp/server.js";
import { Logger } from "./utils/logger.js";
import { createHttpServer } from "./http/server.js";

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

  if (config.TRANSPORT_MODE === "http") {
    const app = createHttpServer({
      storage,
      logger,
      apiKey: config.API_KEY!,
      host: config.HTTP_HOST,
      port: config.HTTP_PORT,
      corsOrigin: config.CORS_ORIGIN,
      rateLimitMax: config.RATE_LIMIT_MAX,
      rateLimitWindow: config.RATE_LIMIT_WINDOW,
    });

    await app.listen({ port: config.HTTP_PORT, host: config.HTTP_HOST });
    logger.info(`AgentVault MCP server running on http://${config.HTTP_HOST}:${config.HTTP_PORT}`);
    logger.info(`Health: http://${config.HTTP_HOST}:${config.HTTP_PORT}/health`);
  } else {
    const server = createVaultServer({ storage, logger });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("AgentVault MCP server running (stdio mode)");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
