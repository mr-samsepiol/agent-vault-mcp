import { describe, it, expect } from "vitest";
import { registerHealthRoutes } from "../../../src/http/health.js";
import Fastify from "fastify";

describe("Health Check Endpoints", () => {
  async function buildApp() {
    const app = Fastify();
    registerHealthRoutes(app);
    await app.ready();
    return app;
  }

  it("GET /health should return 200 with status ok", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();

    await app.close();
  });

  it("GET /ready should return 200 with ready status", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ready");

    await app.close();
  });
});
