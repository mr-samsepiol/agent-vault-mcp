import { describe, it, expect, beforeAll } from "vitest";
import { InMemoryStorageAdapter } from "../../src/storage/storage-adapter.js";

describe("MD Plan Storage — Stdio Transport Simulation", () => {
  let storage: InMemoryStorageAdapter;

  beforeAll(() => {
    storage = new InMemoryStorageAdapter();
  });

  describe("Case: Git repository (project_name = repo name)", () => {
    const repoName = "agent-vault-mcp";
    const planContent = "# Auth Feature\n\n## Overview\nImplement JWT auth...\n\n## Steps\n1. Add middleware\n2. Add tests";

    it("should save an MD plan under repo name", async () => {
      await storage.saveMdPlan({ projectName: repoName, filename: "2026-04-19-auth.md" }, planContent);
      const saved = await storage.getMdPlan({ projectName: repoName, filename: "2026-04-19-auth.md" });
      expect(saved).toBe(planContent);
    });

    it("should list plans under repo name", async () => {
      const plans = await storage.listMdPlans(repoName);
      expect(plans).toContain("2026-04-19-auth.md");
    });

    it("should retrieve plan content", async () => {
      const content = await storage.getMdPlan({ projectName: repoName, filename: "2026-04-19-auth.md" });
      expect(content).toContain("# Auth Feature");
      expect(content).toContain("Implement JWT auth");
    });
  });

  describe("Case: No git repo (project_name = parent directory name)", () => {
    const dirName = "Documents";
    const planContent = "# Personal Project\n\n## Goals\n- Learn Rust\n- Build CLI tool";

    it("should save an MD plan under directory name", async () => {
      await storage.saveMdPlan({ projectName: dirName, filename: "2026-04-20-learning.md" }, planContent);
      const saved = await storage.getMdPlan({ projectName: dirName, filename: "2026-04-20-learning.md" });
      expect(saved).toBe(planContent);
    });

    it("should list plans under directory name", async () => {
      const plans = await storage.listMdPlans(dirName);
      expect(plans).toContain("2026-04-20-learning.md");
    });

    it("should not mix plans from different project contexts", async () => {
      const repoPlans = await storage.listMdPlans("agent-vault-mcp");
      const dirPlans = await storage.listMdPlans("Documents");
      expect(repoPlans).not.toContain("2026-04-20-learning.md");
      expect(dirPlans).not.toContain("2026-04-19-auth.md");
    });
  });

  describe("Case: List workspaces across multiple projects", () => {
    it("should list all workspace directories", async () => {
      await storage.saveMdPlan({ projectName: "frontend-app", filename: "plan.md" }, "A");
      await storage.saveMdPlan({ projectName: "backend-api", filename: "plan.md" }, "B");
      await storage.saveMdPlan({ projectName: "shared-libs", filename: "plan.md" }, "C");
      const workspaces = await storage.listWorkspaces();
      expect(workspaces).toContain("frontend-app");
      expect(workspaces).toContain("backend-api");
      expect(workspaces).toContain("shared-libs");
    });
  });
});
