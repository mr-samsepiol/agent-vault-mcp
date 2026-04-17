import { describe, it, expect } from "vitest";
import { validatePlan } from "../../src/schema/plan-validator.js";

describe("validatePlan", () => {
  it("should return success with data for valid plan", () => {
    const plan = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      agent_id: "agent-001",
      version: "1",
      goals: [
        {
          id: "660e8400-e29b-41d4-a716-446655440001",
          description: "Test goal",
          priority: "high",
          status: "pending",
        },
      ],
      metadata: {
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
        author: "system",
      },
    };

    const result = validatePlan(plan);
    expect(result.success).toBe(true);
    expect(result.data?.agent_id).toBe("agent-001");
    expect(result.data?.status).toBe("active");
  });

  it("should return errors for invalid plan", () => {
    const result = validatePlan({ id: "bad" });
    expect(result.success).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("should include path information in errors", () => {
    const result = validatePlan({
      id: "550e8400-e29b-41d4-a716-446655440000",
      agent_id: "agent-1",
      version: "1",
      goals: [],
      metadata: {
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
        author: "system",
      },
    });
    expect(result.success).toBe(false);
    const goalError = result.errors!.find((e) => e.path.includes("goals"));
    expect(goalError).toBeDefined();
  });
});
