import { describe, it, expect } from "vitest";
import { VersionManager } from "../../../src/versioning/version-manager.js";
import type { PlanMeta } from "../../../src/storage/storage-adapter.js";

describe("VersionManager", () => {
  it("should create initial metadata", () => {
    const meta = VersionManager.createInitialMeta(
      "plan-1",
      "agent-1",
      "user-1",
    );
    expect(meta.planId).toBe("plan-1");
    expect(meta.agentId).toBe("agent-1");
    expect(meta.userId).toBe("user-1");
    expect(meta.currentVersion).toBe(1);
    expect(meta.versions).toEqual([1]);
    expect(meta.createdAt).toBeDefined();
    expect(meta.updatedAt).toBeDefined();
  });

  it("should increment version", () => {
    const base: PlanMeta = {
      planId: "plan-1",
      agentId: "agent-1",
      userId: "user-1",
      currentVersion: 2,
      versions: [1, 2],
      createdAt: "2026-04-17T00:00:00Z",
      updatedAt: "2026-04-17T00:00:00Z",
    };

    const next = VersionManager.incrementVersion(base);
    expect(next.currentVersion).toBe(3);
    expect(next.versions).toEqual([1, 2, 3]);
    expect(next.updatedAt).not.toBe(base.updatedAt);
  });

  it("should preserve immutable fields on increment", () => {
    const base: PlanMeta = {
      planId: "plan-1",
      agentId: "agent-1",
      userId: "user-1",
      currentVersion: 1,
      versions: [1],
      createdAt: "2026-04-17T00:00:00Z",
      updatedAt: "2026-04-17T00:00:00Z",
    };

    const next = VersionManager.incrementVersion(base);
    expect(next.planId).toBe(base.planId);
    expect(next.agentId).toBe(base.agentId);
    expect(next.userId).toBe(base.userId);
    expect(next.createdAt).toBe(base.createdAt);
  });

  it("should check if version exists", () => {
    const meta: PlanMeta = {
      planId: "plan-1",
      agentId: "agent-1",
      userId: "user-1",
      currentVersion: 3,
      versions: [1, 2, 3],
      createdAt: "2026-04-17T00:00:00Z",
      updatedAt: "2026-04-17T00:00:00Z",
    };

    expect(VersionManager.versionExists(meta, 1)).toBe(true);
    expect(VersionManager.versionExists(meta, 3)).toBe(true);
    expect(VersionManager.versionExists(meta, 4)).toBe(false);
  });

  it("should format version number as string", () => {
    expect(VersionManager.formatVersion(1)).toBe("1");
    expect(VersionManager.formatVersion(12)).toBe("12");
  });
});
