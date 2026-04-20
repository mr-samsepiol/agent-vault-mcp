import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { handleSaveMdPlan } from "../../../src/mcp/tools/save-md-plan.js";

describe("handleSaveMdPlan", () => {
  let storage: InMemoryStorageAdapter;
  let logger: Logger;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    logger = new Logger("silent");
  });

  it("should save MD plan and return success", async () => {
    const result = await handleSaveMdPlan(
      {
        user_id: "user-1",
        project_name: "agent-vault-mcp",
        filename: "2026-04-19-feature.md",
        content: "# Feature Plan\n\n## Overview\nDetails here...",
      },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.filename).toBe("2026-04-19-feature.md");
    expect(parsed.project_name).toBe("agent-vault-mcp");
  });

  it("should reject empty content", async () => {
    const result = await handleSaveMdPlan(
      { user_id: "user-1", project_name: "agent-vault-mcp", filename: "empty.md", content: "" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("content");
  });

  it("should reject missing filename", async () => {
    const result = await handleSaveMdPlan(
      { user_id: "user-1", project_name: "agent-vault-mcp", filename: "", content: "# Plan" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("filename");
  });

  it("should reject missing project_name", async () => {
    const result = await handleSaveMdPlan(
      { user_id: "user-1", project_name: "", filename: "plan.md", content: "# Plan" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("project_name");
  });

  it("should persist actual content to storage", async () => {
    const content = "# Real Plan\n\n## Steps\n1. Do thing\n2. Done";
    await handleSaveMdPlan(
      { user_id: "user-1", project_name: "my-repo", filename: "real-plan.md", content },
      storage,
      logger,
    );
    const saved = await storage.getMdPlan({
      userId: "user-1",
      projectName: "my-repo",
      filename: "real-plan.md",
    });
    expect(saved).toBe(content);
  });
});
