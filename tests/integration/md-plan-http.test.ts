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
      port: 0,
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
      expect(storage).toBeDefined();
      expect(storage).toBeInstanceOf(InMemoryStorageAdapter);
    });

    it("should support saving MD plans for different project contexts", async () => {
      await storage.saveMdPlan(
        { projectName: "my-awesome-repo", filename: "2026-04-19-http-plan.md" },
        "# HTTP Plan\n\n## Repo Case\nThis was saved via HTTP transport.",
      );

      await storage.saveMdPlan(
        { projectName: "my-projects-folder", filename: "2026-04-20-dirname-plan.md" },
        "# Directory Plan\n\n## Dirname Case\nSaved without git repo context.",
      );

      const repoPlan = await storage.getMdPlan({
        projectName: "my-awesome-repo",
        filename: "2026-04-19-http-plan.md",
      });
      expect(repoPlan).toContain("Repo Case");

      const dirPlan = await storage.getMdPlan({
        projectName: "my-projects-folder",
        filename: "2026-04-20-dirname-plan.md",
      });
      expect(dirPlan).toContain("Dirname Case");
    });

    it("should isolate plans between different project contexts", async () => {
      await storage.saveMdPlan(
        { projectName: "my-awesome-repo", filename: "repo-plan.md" },
        "# Repo Plan",
      );
      await storage.saveMdPlan(
        { projectName: "my-projects-folder", filename: "dir-plan.md" },
        "# Directory Plan",
      );

      const repoPlans = await storage.listMdPlans("my-awesome-repo");
      expect(repoPlans).toContain("repo-plan.md");
      expect(repoPlans).not.toContain("dir-plan.md");

      const dirPlans = await storage.listMdPlans("my-projects-folder");
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
