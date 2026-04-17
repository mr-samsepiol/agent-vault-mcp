import { describe, it, expect } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { handleSavePlan } from "../../../src/mcp/tools/save-plan.js";
import { handleGetPlan } from "../../../src/mcp/tools/get-plan.js";
import { handleListPlans } from "../../../src/mcp/tools/list-plans.js";
import { handleCreateVersion } from "../../../src/mcp/tools/create-version.js";
import { handleValidatePlan } from "../../../src/mcp/tools/validate-plan.js";
import { Logger } from "../../../src/utils/logger.js";

const testPlan = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  agent_id: "agent-001",
  version: "1",
  goals: [{ id: "660e8400-e29b-41d4-a716-446655440001", description: "Perform data analysis", priority: "high" as const, status: "pending" as const }],
  tools: [{ name: "data_query", purpose: "Query data sources", config: {} }],
  execution_steps: [{ order: 1, action: "Query database", tool: "data_query", input: { table: "users" }, expected_output: "Result set", on_failure: "retry" as const }],
  triggers: [{ type: "event" as const, event: "schedule", action: "execute_plan" as const }],
  metadata: { created_at: "2026-04-17T00:00:00Z", updated_at: "2026-04-17T00:00:00Z", author: "integration-test", tags: ["data", "analysis"] },
};

describe("Full lifecycle integration", () => {
  it("should complete create -> validate -> save -> get -> version -> list flow", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    // Step 1: Validate before saving
    const validation = await handleValidatePlan({ plan: testPlan }, storage, logger);
    expect(JSON.parse(validation.content[0].text).valid).toBe(true);

    // Step 2: Save the plan
    const saveResult = await handleSavePlan({ user_id: "user-1", agent_id: "agent-001", plan: testPlan }, storage, logger);
    const saved = JSON.parse(saveResult.content[0].text);
    expect(saved.success).toBe(true);
    expect(saved.version).toBe(1);

    // Step 3: Retrieve the plan
    const getResult = await handleGetPlan({ user_id: "user-1", agent_id: "agent-001", plan_id: testPlan.id }, storage, logger);
    const retrieved = JSON.parse(getResult.content[0].text);
    expect(retrieved.agent_id).toBe("agent-001");
    expect(retrieved.version).toBe("1");

    // Step 4: Create a new version
    const updatedPlan = { ...testPlan, goals: [...testPlan.goals, { id: "660e8400-e29b-41d4-a716-446655440002", description: "Generate report", priority: "medium" as const, status: "pending" as const }] };
    const versionResult = await handleCreateVersion({ user_id: "user-1", agent_id: "agent-001", plan_id: testPlan.id, plan: updatedPlan }, storage, logger);
    const versioned = JSON.parse(versionResult.content[0].text);
    expect(versioned.success).toBe(true);
    expect(versioned.version).toBe(2);

    // Step 5: Get specific version
    const v1 = await handleGetPlan({ user_id: "user-1", agent_id: "agent-001", plan_id: testPlan.id, version: 1 }, storage, logger);
    expect(JSON.parse(v1.content[0].text).version).toBe("1");
    expect(JSON.parse(v1.content[0].text).goals.length).toBe(1);

    // Step 6: Get latest (v2)
    const latest = await handleGetPlan({ user_id: "user-1", agent_id: "agent-001", plan_id: testPlan.id }, storage, logger);
    expect(JSON.parse(latest.content[0].text).version).toBe("2");
    expect(JSON.parse(latest.content[0].text).goals.length).toBe(2);

    // Step 7: List plans
    const listResult = await handleListPlans({ user_id: "user-1", agent_id: "agent-001" }, storage, logger);
    expect(JSON.parse(listResult.content[0].text).plans).toContain(testPlan.id);
  });

  it("should reject versioning of nonexistent plan", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");
    const result = await handleCreateVersion({ user_id: "user-1", agent_id: "agent-001", plan_id: "nonexistent-id", plan: testPlan }, storage, logger);
    expect(JSON.parse(result.content[0].text).success).toBe(false);
    expect(result.isError).toBe(true);
  });
});
