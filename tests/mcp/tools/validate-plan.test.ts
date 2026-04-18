import { describe, it, expect } from "vitest";
import { handleValidatePlan } from "../../../src/mcp/tools/validate-plan.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleValidatePlan", () => {
  it("should return valid for a correct plan", async () => {
    const validPlan = {
      id: "550e8400-e29b-41d4-a716-446655440000", agent_id: "agent-001", version: "1",
      goals: [{ id: "660e8400-e29b-41d4-a716-446655440001", description: "Test", priority: "high", status: "pending" }],
      metadata: { created_at: "2026-04-17T00:00:00Z", updated_at: "2026-04-17T00:00:00Z", author: "system" },
    };
    const result = await handleValidatePlan({ plan: validPlan }, new InMemoryStorageAdapter(), new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(true);
    expect(parsed.data.agent_id).toBe("agent-001");
  });

  it("should return errors for an invalid plan", async () => {
    const result = await handleValidatePlan({ plan: { bad: true } }, new InMemoryStorageAdapter(), new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(result.isError).toBe(true);
  });
});
