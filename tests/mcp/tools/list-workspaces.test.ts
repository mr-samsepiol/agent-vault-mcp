import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { handleListWorkspaces } from "../../../src/mcp/tools/list-workspaces.js";

describe("handleListWorkspaces", () => {
  let storage: InMemoryStorageAdapter;
  let logger: Logger;

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter();
    logger = new Logger("silent");
    await storage.saveMdPlan({ userId: "user-1", projectName: "repo-a", filename: "plan.md" }, "# A");
    await storage.saveMdPlan({ userId: "user-1", projectName: "repo-b", filename: "plan.md" }, "# B");
    await storage.saveMdPlan({ userId: "user-2", projectName: "repo-c", filename: "plan.md" }, "# C");
  });

  it("should list workspaces for a user", async () => {
    const result = await handleListWorkspaces({ user_id: "user-1" }, storage, logger);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.workspaces).toEqual(["repo-a", "repo-b"]);
  });

  it("should return empty array for user with no workspaces", async () => {
    const result = await handleListWorkspaces({ user_id: "unknown" }, storage, logger);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.workspaces).toEqual([]);
  });

  it("should reject empty user_id", async () => {
    const result = await handleListWorkspaces({ user_id: "" }, storage, logger);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("user_id");
  });

  it("should not leak workspaces from other users", async () => {
    const result = await handleListWorkspaces({ user_id: "user-2" }, storage, logger);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.workspaces).toEqual(["repo-c"]);
  });
});
