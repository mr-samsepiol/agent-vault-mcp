import { describe, it, expect, afterEach } from "vitest";
import { createHttpServer } from "../../../src/http/server.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import type { FastifyInstance } from "fastify";

const API_KEY = "integration-test-key";

const validPlan = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  agent_id: "agent-001",
  version: "1",
  goals: [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      description: "Integration test goal",
      priority: "high" as const,
      status: "pending" as const,
    },
  ],
  metadata: {
    created_at: "2026-04-17T00:00:00Z",
    updated_at: "2026-04-17T00:00:00Z",
    author: "integration-test",
  },
};

function buildApp(): FastifyInstance {
  const storage = new InMemoryStorageAdapter();
  const logger = new Logger("error");

  return createHttpServer({
    storage,
    logger,
    apiKey: API_KEY,
    host: "127.0.0.1",
    port: 0,
    corsOrigin: "*",
    rateLimitMax: 1000,
    rateLimitWindow: 60000,
  });
}

describe("HTTP Integration: Full MCP flow", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("should initialize MCP session and list tools", async () => {
    app = buildApp();
    await app.ready();

    const headers = {
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    };

    const initResponse = await app.inject({
      method: "POST",
      url: "/mcp",
      headers,
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

    expect(initResponse.statusCode).toBe(200);

    // Extract session ID from initialize response headers
    const sessionId = initResponse.headers['mcp-session-id'];

    const toolsResponse = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        ...headers,
        'mcp-session-id': sessionId as string,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        id: 2,
        params: {},
      }),
    });

    expect(toolsResponse.statusCode).toBe(200);
    const body = toolsResponse.body;
    expect(body).toContain("save_plan");
    expect(body).toContain("get_plan");
    expect(body).toContain("list_plans");
    expect(body).toContain("create_version");
    expect(body).toContain("validate_plan");
  });

  it("should reject unauthenticated tool calls", async () => {
    app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id: 1,
        params: {
          name: "list_plans",
          arguments: { user_id: "user-1", agent_id: "agent-1" },
        },
      }),
    });

    expect(response.statusCode).toBe(401);
  });
});
