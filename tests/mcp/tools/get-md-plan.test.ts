import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { handleGetMdPlan } from "../../../src/mcp/tools/get-md-plan.js";

describe("handleGetMdPlan", () => {
  let storage: InMemoryStorageAdapter;
  let logger: Logger;

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter();
    logger = new Logger("silent");
    await storage.saveMdPlan(
      { userId: "user-1", projectName: "my-repo", filename: "plan.md" },
      "# Plan\n\n## Content\nDetails...",
    );
  });

  it("should retrieve an existing MD plan", async () => {
    const result = await handleGetMdPlan(
      { user_id: "user-1", project_name: "my-repo", filename: "plan.md" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.content).toBe("# Plan\n\n## Content\nDetails...");
  });

  it("should return error for non-existent plan", async () => {
    const result = await handleGetMdPlan(
      { user_id: "user-1", project_name: "my-repo", filename: "nope.md" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("not found");
  });

  it("should reject missing project_name", async () => {
    const result = await handleGetMdPlan(
      { user_id: "user-1", project_name: "", filename: "plan.md" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("project_name");
  });
});
