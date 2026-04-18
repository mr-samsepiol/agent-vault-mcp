import { describe, it, expect, beforeEach } from "vitest";
import { handleSavePlan } from "../../../src/mcp/tools/save-plan.js";
import { InMemoryStorageAdapter, type StorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleSavePlan", () => {
  let storage: StorageAdapter;
  beforeEach(() => { storage = new InMemoryStorageAdapter(); });

  const validPlan = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    agent_id: "agent-001", version: "1",
    goals: [{ id: "660e8400-e29b-41d4-a716-446655440001", description: "Test goal", priority: "high" as const, status: "pending" as const }],
    metadata: { created_at: "2026-04-17T00:00:00Z", updated_at: "2026-04-17T00:00:00Z", author: "test" },
  };

  it("should save a valid plan and return success", async () => {
    const result = await handleSavePlan({ user_id: "user-1", agent_id: "agent-001", plan: validPlan }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.plan_id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(parsed.version).toBe(1);
  });

  it("should persist the plan in storage", async () => {
    await handleSavePlan({ user_id: "user-1", agent_id: "agent-001", plan: validPlan }, storage, new Logger());
    const stored = await storage.getPlan({ userId: "user-1", agentId: "agent-001", planId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(stored).toBeDefined();
  });

  it("should persist metadata", async () => {
    await handleSavePlan({ user_id: "user-1", agent_id: "agent-001", plan: validPlan }, storage, new Logger());
    const meta = await storage.getMeta({ userId: "user-1", agentId: "agent-001", planId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(meta).not.toBeNull();
    expect(meta!.currentVersion).toBe(1);
  });

  it("should reject an invalid plan", async () => {
    const result = await handleSavePlan({ user_id: "user-1", agent_id: "agent-001", plan: { id: "bad" } }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(result.isError).toBe(true);
  });
});
