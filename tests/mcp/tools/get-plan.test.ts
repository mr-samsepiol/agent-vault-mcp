import { describe, it, expect, beforeEach } from "vitest";
import { handleGetPlan } from "../../../src/mcp/tools/get-plan.js";
import { InMemoryStorageAdapter, type StorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleGetPlan", () => {
  let storage: StorageAdapter;
  beforeEach(() => { storage = new InMemoryStorageAdapter(); });

  it("should retrieve latest plan when no version specified", async () => {
    await storage.savePlan({ userId: "user-1", agentId: "agent-1", planId: "plan-1", version: 1 }, { id: "plan-1", version: "1" });
    const result = await handleGetPlan({ user_id: "user-1", agent_id: "agent-1", plan_id: "plan-1" }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.version).toBe("1");
  });

  it("should retrieve specific version when version is set", async () => {
    await storage.savePlan({ userId: "user-1", agentId: "agent-1", planId: "plan-1", version: 1 }, { id: "plan-1", version: "1" });
    await storage.savePlan({ userId: "user-1", agentId: "agent-1", planId: "plan-1", version: 2 }, { id: "plan-1", version: "2" });
    const result = await handleGetPlan({ user_id: "user-1", agent_id: "agent-1", plan_id: "plan-1", version: 1 }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.version).toBe("1");
  });

  it("should return error for missing plan", async () => {
    const result = await handleGetPlan({ user_id: "user-1", agent_id: "agent-1", plan_id: "nonexistent" }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(result.isError).toBe(true);
  });
});
