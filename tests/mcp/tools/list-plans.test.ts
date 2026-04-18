import { describe, it, expect, beforeEach } from "vitest";
import { handleListPlans } from "../../../src/mcp/tools/list-plans.js";
import { InMemoryStorageAdapter, type StorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleListPlans", () => {
  let storage: StorageAdapter;
  beforeEach(() => { storage = new InMemoryStorageAdapter(); });

  it("should return plan IDs for an agent", async () => {
    await storage.savePlan({ userId: "user-1", agentId: "agent-1", planId: "plan-a", version: 1 }, {});
    await storage.savePlan({ userId: "user-1", agentId: "agent-1", planId: "plan-b", version: 1 }, {});
    const result = await handleListPlans({ user_id: "user-1", agent_id: "agent-1" }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.plans.sort()).toEqual(["plan-a", "plan-b"]);
  });

  it("should return empty array when no plans exist", async () => {
    const result = await handleListPlans({ user_id: "user-1", agent_id: "agent-1" }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.plans).toEqual([]);
  });

  it("should only list plans for the specified agent", async () => {
    await storage.savePlan({ userId: "user-1", agentId: "agent-1", planId: "plan-a", version: 1 }, {});
    await storage.savePlan({ userId: "user-1", agentId: "agent-2", planId: "plan-b", version: 1 }, {});
    const result = await handleListPlans({ user_id: "user-1", agent_id: "agent-1" }, storage, new Logger());
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.plans).toEqual(["plan-a"]);
  });
});
