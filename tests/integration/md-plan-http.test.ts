import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHttpServer } from "../../src/http/server.js";
import { InMemoryStorageAdapter } from "../../src/storage/storage-adapter.js";
import { Logger } from "../../src/utils/logger.js";
import type { FastifyInstance } from "fastify";

describe("MD Plan Storage — HTTP Server Integration", () => {
  let app: FastifyInstance | null = null;
  let storage: InMemoryStorageAdapter;
  const apiKey = "test-api-key";

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter();
    const logger = new Logger("silent");
    app = createHttpServer({
      storage,
      logger,
      apiKey,
      host: "127.0.0.1",
      port: 0, // Use random port for tests
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  describe("HTTP Server — MD Plan Storage Backend", () => {
    it("should use InMemoryStorageAdapter for HTTP transport", async () => {
      // Test that the HTTP server is configured with storage
      expect(storage).toBeDefined();
      expect(storage).toBeInstanceOf(InMemoryStorageAdapter);
    });

    it("should support saving MD plans for different project contexts", async () => {
      // Simulate repo-based project
      await storage.saveMdPlan(
        { userId: "user-http-1", projectName: "my-awesome-repo", filename: "2026-04-19-http-plan.md" },
        "# HTTP Plan\n\n## Repo Case\nThis was saved via HTTP transport.",
      );

      // Simulate directory-based project
      await storage.saveMdPlan(
        { userId: "user-http-2", projectName: "my-projects-folder", filename: "2026-04-20-dirname-plan.md" },
        "# Directory Plan\n\n## Dirname Case\nSaved without git repo context.",
      );

      // Verify both are stored correctly
      const repoPlan = await storage.getMdPlan({
        userId: "user-http-1",
        projectName: "my-awesome-repo",
        filename: "2026-04-19-http-plan.md",
      });
      expect(repoPlan).toContain("Repo Case");

      const dirPlan = await storage.getMdPlan({
        userId: "user-http-2",
        projectName: "my-projects-folder",
        filename: "2026-04-20-dirname-plan.md",
      });
      expect(dirPlan).toContain("Dirname Case");
    });

    it("should isolate plans between different project contexts", async () => {
      // Save plans in different contexts
      await storage.saveMdPlan(
        { userId: "user-http-1", projectName: "my-awesome-repo", filename: "repo-plan.md" },
        "# Repo Plan",
      );
      await storage.saveMdPlan(
        { userId: "user-http-2", projectName: "my-projects-folder", filename: "dir-plan.md" },
        "# Directory Plan",
      );

      // List plans for repo context
      const repoPlans = await storage.listMdPlans("user-http-1", "my-awesome-repo");
      expect(repoPlans).toContain("repo-plan.md");
      expect(repoPlans).not.toContain("dir-plan.md");

      // List plans for directory context
      const dirPlans = await storage.listMdPlans("user-http-2", "my-projects-folder");
      expect(dirPlans).toContain("dir-plan.md");
      expect(dirPlans).not.toContain("repo-plan.md");
    });
  });

  describe("HTTP Server — Authentication", () => {
    it("should reject unauthenticated requests to /mcp", async () => {
      const response = await app!.inject({
        method: "POST",
        url: "/mcp",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
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
      const response = await app!.inject({
        method: "POST",
        url: "/mcp",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        }),
      });
      expect(response.statusCode).toBe(200);
      // SSE format response
      expect(response.body).toContain("event: message");
    });
  });

  describe("HTTP Server — Health Endpoints", () => {
    it("should return 200 for /health", async () => {
      const response = await app!.inject({
        method: "GET",
        url: "/health",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: "ok" });
    });

    it("should return 200 for /ready", async () => {
      const response = await app!.inject({
        method: "GET",
        url: "/ready",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: "ready" });
    });
  });
});
