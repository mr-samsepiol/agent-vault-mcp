import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { McpServer } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createMcpFastifyApp, hostHeaderValidation } from "@modelcontextprotocol/fastify";
import type { StorageAdapter } from "../storage/storage-adapter.js";
import type { Logger } from "../utils/logger.js";
import { createVaultServer } from "../mcp/server.js";
import { createAuthHook } from "./auth.js";
import { registerHealthRoutes } from "./health.js";

export interface HttpServerOptions {
  storage: StorageAdapter;
  logger: Logger;
  apiKey: string;
  host: string;
  port: number;
  corsOrigin: string;
  rateLimitMax: number;
  rateLimitWindow: number;
}

export function createHttpServer(options: HttpServerOptions): ReturnType<typeof Fastify> {
  const app = createMcpFastifyApp({ host: options.host });

  app.register(cors, {
    origin: options.corsOrigin,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.register(rateLimit, {
    max: options.rateLimitMax,
    timeWindow: options.rateLimitWindow,
  });

  registerHealthRoutes(app);

  const authHook = createAuthHook(options.apiKey);

  const mcpServer = createVaultServer({
    storage: options.storage,
    logger: options.logger,
  });

  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  mcpServer.connect(transport).catch((err) => {
    options.logger.error("Failed to connect MCP server to transport", err);
  });

  app.addHook("onRequest", hostHeaderValidation(["localhost", "127.0.0.1", options.host]));

  app.all("/mcp", {
    onRequest: authHook,
  }, async (request, reply) => {
    await transport.handleRequest(request.raw, reply.raw, request.body);
  });

  return app;
}
