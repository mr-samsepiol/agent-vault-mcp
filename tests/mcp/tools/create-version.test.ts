import { describe, it, expect, beforeEach } from "vitest";
import { handleCreateVersion } from "../../../src/mcp/tools/create-version.js";
import { InMemoryStorageAdapter, type StorageAdapter, type PlanMeta } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleCreateVersion", () => {
  let storage: StorageAdapter;
  beforeEach(() => { storage = new InMemoryStorageAdapter(); });

  const validPlan = {
    id: "550e8400-e29b-41d4-a716-446655440000", agent_id: "agent-001", version: "2",
    goals: [{ id: "660e8400-e29b-41d4-a716-446655440001", description: "Updated goal", priority: "high" as const, status: "pending" as const }],
    metadata: { created_at: "2026-04-17T00:00:00Z", updated_at: "2026-04-17T00:00:00Z", author: "test" },
  };

  it("should create a new version of an existing plan", async () => {
    const existingMeta: PlanMeta = { planId: "550e8400-e29b-41d4-a716-446655440000", agentId: "agent-001", userId: "user-1", currentVersion: 1, versions: [1], createdAt: "2026-04-17T00:00:00Z", updatedAt: "2026-04-17T00:00:00Z" };
    await storage.saveMeta({ userId: "user-1", agentId: "agent-001", planId: "550e8400-e29b-41d4-a716-446655440000" }, existingMeta);
    const result = await handleCreateVersion({ user_id: "user-1", agent_id: "agent-001", plan_id: "550e8400-e29b-41d4-a716-446655440000", plan: validPlan }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.version).toBe(2);
    const meta = await storage.getMeta({ userId: "user-1", agentId: "agent-001", planId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(meta!.currentVersion).toBe(2);
    expect(meta!.versions).toEqual([1, 2]);
  });

  it("should reject invalid plan", async () => {
    const result = await handleCreateVersion({ user_id: "user-1", agent_id: "agent-001", plan_id: "plan-1", plan: { bad: "data" } }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(result.isError).toBe(true);
  });

  it("should return error when plan does not exist", async () => {
    const result = await handleCreateVersion({ user_id: "user-1", agent_id: "agent-001", plan_id: "550e8400-e29b-41d4-a716-446655440000", plan: validPlan }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(result.isError).toBe(true);
  });
});
