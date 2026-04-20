import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { handleListMdPlans } from "../../../src/mcp/tools/list-md-plans.js";

describe("handleListMdPlans", () => {
  let storage: InMemoryStorageAdapter;
  let logger: Logger;

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter();
    logger = new Logger("silent");
    await storage.saveMdPlan({ userId: "user-1", projectName: "my-repo", filename: "plan-a.md" }, "# A");
    await storage.saveMdPlan({ userId: "user-1", projectName: "my-repo", filename: "plan-b.md" }, "# B");
    await storage.saveMdPlan({ userId: "user-1", projectName: "other-project", filename: "plan-c.md" }, "# C");
  });

  it("should list plans for a specific project", async () => {
    const result = await handleListMdPlans(
      { user_id: "user-1", project_name: "my-repo" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.plans).toEqual(["plan-a.md", "plan-b.md"]);
  });

  it("should return empty array for project with no plans", async () => {
    const result = await handleListMdPlans(
      { user_id: "user-1", project_name: "empty" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.plans).toEqual([]);
  });

  it("should not leak plans from other projects", async () => {
    const result = await handleListMdPlans(
      { user_id: "user-1", project_name: "other-project" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.plans).toEqual(["plan-c.md"]);
  });

  it("should reject missing project_name", async () => {
    const result = await handleListMdPlans(
      { user_id: "user-1", project_name: "" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("project_name");
  });
});
