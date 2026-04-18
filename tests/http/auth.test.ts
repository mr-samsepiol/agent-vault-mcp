import { describe, it, expect } from "vitest";
import { createAuthHook } from "../../../src/http/auth.js";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("API Key Authentication", () => {
  const authHook = createAuthHook("valid-api-key");

  function mockRequest(authHeader?: string): FastifyRequest {
    return {
      headers: authHeader ? { authorization: authHeader } : {},
    } as unknown as FastifyRequest;
  }

  function mockReply(): { statusCode: number; sent: string | null } & FastifyReply {
    const state = { statusCode: 200, sent: null as string | null };
    return {
      get statusCode() { return state.statusCode; },
      set statusCode(v) { state.statusCode = v; },
      code(status: number) { state.statusCode = status; return this as unknown as FastifyReply; },
      send(body: unknown) { state.sent = JSON.stringify(body); return this as unknown as FastifyReply; },
    } as unknown as FastifyReply;
  }

  it("should allow requests with valid Bearer token", async () => {
    const err = await authHook(mockRequest("Bearer valid-api-key"), mockReply());
    expect(err).toBeUndefined();
  });

  it("should reject requests with invalid API key", async () => {
    const reply = mockReply();
    const err = await authHook(mockRequest("Bearer wrong-key"), reply);
    expect(err).toBeDefined();
    expect(reply.statusCode).toBe(401);
  });

  it("should reject requests without Authorization header", async () => {
    const reply = mockReply();
    const err = await authHook(mockRequest(), reply);
    expect(err).toBeDefined();
    expect(reply.statusCode).toBe(401);
  });

  it("should reject requests with malformed Authorization header", async () => {
    const reply = mockReply();
    const err = await authHook(mockRequest("Basic abc123"), reply);
    expect(err).toBeDefined();
    expect(reply.statusCode).toBe(401);
  });
});
