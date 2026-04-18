import { describe, it, expect } from "vitest";
import {
  type StorageKey,
  type PlanMeta,
  InMemoryStorageAdapter,
} from "../../../src/storage/storage-adapter.js";

const testKey: StorageKey = {
  userId: "user-1",
  agentId: "agent-1",
  planId: "plan-1",
};

const testMeta: PlanMeta = {
  planId: "plan-1",
  agentId: "agent-1",
  userId: "user-1",
  currentVersion: 1,
  versions: [1],
  createdAt: "2026-04-17T00:00:00Z",
  updatedAt: "2026-04-17T00:00:00Z",
};

describe("InMemoryStorageAdapter", () => {
  it("should save and retrieve a plan", async () => {
    const storage = new InMemoryStorageAdapter();
    const data = { test: "data" };

    await storage.savePlan({ ...testKey, version: 1 }, data);
    const result = await storage.getPlan(testKey);

    expect(result).toEqual(data);
  });

  it("should update latest when saving new version", async () => {
    const storage = new InMemoryStorageAdapter();
    const v1 = { version: 1 };
    const v2 = { version: 2 };

    await storage.savePlan({ ...testKey, version: 1 }, v1);
    await storage.savePlan({ ...testKey, version: 2 }, v2);

    const latest = await storage.getPlan(testKey);
    expect(latest).toEqual(v2);
  });

  it("should retrieve a specific version", async () => {
    const storage = new InMemoryStorageAdapter();

    await storage.savePlan({ ...testKey, version: 1 }, { version: 1 });
    await storage.savePlan({ ...testKey, version: 2 }, { version: 2 });

    const result = await storage.getPlan({ ...testKey, version: 1 });
    expect(result).toEqual({ version: 1 });
  });

  it("should save and retrieve metadata", async () => {
    const storage = new InMemoryStorageAdapter();

    await storage.saveMeta(testKey, testMeta);
    const meta = await storage.getMeta(testKey);

    expect(meta).toEqual(testMeta);
  });

  it("should return null for missing metadata", async () => {
    const storage = new InMemoryStorageAdapter();
    const meta = await storage.getMeta(testKey);
    expect(meta).toBeNull();
  });

  it("should list plan IDs for an agent", async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.savePlan({ ...testKey, planId: "plan-a", version: 1 }, {});
    await storage.savePlan({ ...testKey, planId: "plan-b", version: 1 }, {});
    await storage.savePlan({ ...testKey, planId: "plan-c", version: 1 }, {});

    const plans = await storage.listPlans("user-1", "agent-1");
    expect(plans.sort()).toEqual(["plan-a", "plan-b", "plan-c"]);
  });

  it("should return empty array when no plans exist", async () => {
    const storage = new InMemoryStorageAdapter();
    const plans = await storage.listPlans("user-1", "agent-1");
    expect(plans).toEqual([]);
  });

  it("should delete a plan and its metadata", async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.savePlan({ ...testKey, version: 1 }, { data: "test" });
    await storage.saveMeta(testKey, testMeta);

    await storage.deletePlan(testKey);

    const meta = await storage.getMeta(testKey);
    expect(meta).toBeNull();
  });
});
