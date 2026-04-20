import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { WorkspaceManager } from "../../../src/workspace/workspace-manager.js";
import { handleSetWorkspace } from "../../../src/mcp/tools/set-workspace.js";
import { handleSaveMdPlan } from "../../../src/mcp/tools/save-md-plan.js";
import { handleGetMdPlan } from "../../../src/mcp/tools/get-md-plan.js";
import { handleListMdPlans } from "../../../src/mcp/tools/list-md-plans.js";

describe("handleSetWorkspace", () => {
  let storage: InMemoryStorageAdapter;
  let logger: Logger;
  let wm: WorkspaceManager;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    logger = new Logger("silent");
    wm = new WorkspaceManager();
  });

  it("should set workspace for a user", async () => {
    const result = await handleSetWorkspace({ user_id: "user-1", project_name: "my-workspace" }, wm, logger);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.workspace).toBe("my-workspace");
    expect(wm.get("user-1")).toBe("my-workspace");
  });

  it("should reject empty user_id", async () => {
    const result = await handleSetWorkspace({ user_id: "", project_name: "workspace" }, wm, logger);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("user_id");
  });

  it("should reject empty project_name", async () => {
    const result = await handleSetWorkspace({ user_id: "user-1", project_name: "" }, wm, logger);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("project_name");
  });

  it("should allow save/get/list without project_name after setting workspace", async () => {
    await handleSetWorkspace({ user_id: "user-1", project_name: "shared-workspace" }, wm, logger);

    await handleSaveMdPlan({ user_id: "user-1", filename: "plan.md", content: "# Plan" }, storage, logger, wm);

    const getResult = await handleGetMdPlan({ user_id: "user-1", filename: "plan.md" }, storage, logger, wm);
    const getParsed = JSON.parse(getResult.content[0].text);
    expect(getParsed.success).toBe(true);
    expect(getParsed.content).toBe("# Plan");
    expect(getParsed.project_name).toBe("shared-workspace");

    const listResult = await handleListMdPlans({ user_id: "user-1" }, storage, logger, wm);
    const listParsed = JSON.parse(listResult.content[0].text);
    expect(listParsed.success).toBe(true);
    expect(listParsed.plans).toEqual(["plan.md"]);
    expect(listParsed.project_name).toBe("shared-workspace");
  });

  it("should fail save without project_name when no workspace set", async () => {
    const result = await handleSaveMdPlan({ user_id: "user-1", filename: "plan.md", content: "# Plan" }, storage, logger, wm);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("set_workspace");
  });

  it("should allow explicit project_name to override workspace", async () => {
    await handleSetWorkspace({ user_id: "user-1", project_name: "workspace-a" }, wm, logger);
    const result = await handleSaveMdPlan(
      { user_id: "user-1", project_name: "workspace-b", filename: "plan.md", content: "# Plan" },
      storage, logger, wm,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.project_name).toBe("workspace-b");
  });

  it("should maintain separate workspaces per user", async () => {
    await handleSetWorkspace({ user_id: "user-1", project_name: "ws-1" }, wm, logger);
    await handleSetWorkspace({ user_id: "user-2", project_name: "ws-2" }, wm, logger);

    await handleSaveMdPlan({ user_id: "user-1", filename: "a.md", content: "A" }, storage, logger, wm);
    await handleSaveMdPlan({ user_id: "user-2", filename: "b.md", content: "B" }, storage, logger, wm);

    const list1 = await handleListMdPlans({ user_id: "user-1" }, storage, logger, wm);
    const list2 = await handleListMdPlans({ user_id: "user-2" }, storage, logger, wm);

    expect(JSON.parse(list1.content[0].text).project_name).toBe("ws-1");
    expect(JSON.parse(list2.content[0].text).project_name).toBe("ws-2");
  });
});
