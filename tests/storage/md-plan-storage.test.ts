import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../src/storage/storage-adapter.js";
import type { MdPlanKey } from "../../src/storage/md-plan-types.js";

describe("InMemoryStorageAdapter - MD Plans", () => {
  let storage: InMemoryStorageAdapter;
  const mdKey: MdPlanKey = {
    projectName: "agent-vault-mcp",
    filename: "2026-04-19-auth-feature.md",
  };
  const mdContent = "# Auth Feature Plan\n\n## Overview\nImplement auth...";

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
  });

  it("should save and retrieve an MD plan", async () => {
    await storage.saveMdPlan(mdKey, mdContent);
    const result = await storage.getMdPlan(mdKey);
    expect(result).toBe(mdContent);
  });

  it("should list MD plans for a project", async () => {
    const key2: MdPlanKey = { ...mdKey, filename: "2026-04-20-api.md" };
    await storage.saveMdPlan(mdKey, mdContent);
    await storage.saveMdPlan(key2, "# API Plan\n\nContent...");
    const plans = await storage.listMdPlans("agent-vault-mcp");
    expect(plans).toHaveLength(2);
    expect(plans).toContain("2026-04-19-auth-feature.md");
    expect(plans).toContain("2026-04-20-api.md");
  });

  it("should overwrite an existing MD plan", async () => {
    await storage.saveMdPlan(mdKey, "original");
    await storage.saveMdPlan(mdKey, "updated");
    const result = await storage.getMdPlan(mdKey);
    expect(result).toBe("updated");
  });

  it("should return null for non-existent MD plan", async () => {
    const result = await storage.getMdPlan(mdKey);
    expect(result).toBeNull();
  });

  it("should return empty array for project with no plans", async () => {
    const plans = await storage.listMdPlans("nonexistent-project");
    expect(plans).toEqual([]);
  });

  it("should separate plans by project name", async () => {
    const otherKey: MdPlanKey = { ...mdKey, projectName: "other-project" };
    await storage.saveMdPlan(mdKey, mdContent);
    await storage.saveMdPlan(otherKey, "Other content");
    const plans1 = await storage.listMdPlans("agent-vault-mcp");
    const plans2 = await storage.listMdPlans("other-project");
    expect(plans1).toHaveLength(1);
    expect(plans2).toHaveLength(1);
  });

  describe("listWorkspaces", () => {
    it("should return all project names", async () => {
      await storage.saveMdPlan({ projectName: "repo-a", filename: "plan.md" }, "A");
      await storage.saveMdPlan({ projectName: "repo-b", filename: "plan.md" }, "B");
      await storage.saveMdPlan({ projectName: "repo-a", filename: "plan2.md" }, "A2");
      const workspaces = await storage.listWorkspaces();
      expect(workspaces).toEqual(["repo-a", "repo-b"]);
    });

    it("should return empty array when no plans exist", async () => {
      const workspaces = await storage.listWorkspaces();
      expect(workspaces).toEqual([]);
    });
  });
});
