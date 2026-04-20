import { describe, it, expect, afterEach } from "vitest";
import { createHttpServer } from "../../../src/http/server.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import type { FastifyInstance } from "fastify";

describe("createHttpServer", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("should create a Fastify instance with MCP route", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    app = createHttpServer({
      storage,
      logger,
      apiKey: "test-key",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });

    await app.ready();
    expect(app).toBeDefined();
  });

  it("should require API key for /mcp endpoint", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    app = createHttpServer({
      storage,
      logger,
      apiKey: "test-key",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });

    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        id: 1,
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    });

    expect(response.statusCode).toBe(401);
  });

  it("should accept authenticated requests to /mcp", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    app = createHttpServer({
      storage,
      logger,
      apiKey: "test-key",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });

    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: "Bearer test-key",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        id: 1,
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    });
    expect(response.statusCode).toBe(200);
    // SSE format response - check that it contains the expected data
    const body = response.body;
    expect(body).toContain("event: message");
    expect(body).toContain("agent-vault-mcp");
  });

  it("should register health check endpoints", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    app = createHttpServer({
      storage,
      logger,
      apiKey: "test-key",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });

    await app.ready();

    const healthResponse = await app.inject({
      method: "GET",
      url: "/health",
    });
    expect(healthResponse.statusCode).toBe(200);

    const readyResponse = await app.inject({
      method: "GET",
      url: "/ready",
    });
    expect(readyResponse.statusCode).toBe(200);
  });
});
