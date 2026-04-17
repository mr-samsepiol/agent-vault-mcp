import { describe, it, expect } from "vitest";
import { PlanSchema } from "../../src/schema/plan-schema.js";

const validPlan = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  agent_id: "agent-001",
  version: "1",
  status: "active",
  goals: [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      description: "Search the web for information",
      priority: "high",
      status: "pending",
    },
  ],
  tools: [
    { name: "web_search", purpose: "Search the internet", config: {} },
  ],
  execution_steps: [
    {
      order: 1,
      action: "Perform web search",
      tool: "web_search",
      input: { query: "{{user_query}}" },
      expected_output: "Search results",
      on_failure: "retry",
    },
  ],
  memory: {
    type: "short_term",
    capacity: "10_items",
    persistence: "session",
    config: {},
  },
  triggers: [
    {
      type: "event",
      event: "user_message",
      action: "execute_plan",
    },
  ],
  metadata: {
    created_at: "2026-04-17T00:00:00Z",
    updated_at: "2026-04-17T00:00:00Z",
    author: "system",
    tags: ["search", "web"],
    description: "A web search agent plan",
  },
};

describe("PlanSchema", () => {
  it("should validate a complete valid plan", () => {
    const result = PlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it("should reject plan without id", () => {
    const { id, ...noId } = validPlan;
    expect(PlanSchema.safeParse(noId).success).toBe(false);
  });

  it("should reject plan without agent_id", () => {
    const { agent_id, ...noAgent } = validPlan;
    expect(PlanSchema.safeParse(noAgent).success).toBe(false);
  });

  it("should reject invalid UUID for id", () => {
    const result = PlanSchema.safeParse({ ...validPlan, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("should reject empty goals array", () => {
    const result = PlanSchema.safeParse({ ...validPlan, goals: [] });
    expect(result.success).toBe(false);
  });

  it("should apply defaults for optional fields", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      agent_id: "agent-001",
      version: "1",
      goals: [
        {
          id: "660e8400-e29b-41d4-a716-446655440001",
          description: "Do something",
          priority: "medium" as const,
          status: "pending" as const,
        },
      ],
      metadata: {
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
        author: "system",
      },
    };

    const result = PlanSchema.parse(minimal);
    expect(result.tools).toEqual([]);
    expect(result.execution_steps).toEqual([]);
    expect(result.triggers).toEqual([]);
    expect(result.status).toBe("active");
    expect(result.memory.type).toBe("short_term");
  });

  it("should reject invalid status value", () => {
    const result = PlanSchema.safeParse({ ...validPlan, status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid priority in goals", () => {
    const plan = {
      ...validPlan,
      goals: [{ ...validPlan.goals[0], priority: "urgent" }],
    };
    expect(PlanSchema.safeParse(plan).success).toBe(false);
  });

  it("should accept all valid status values", () => {
    for (const status of ["draft", "active", "deprecated", "archived"] as const) {
      const result = PlanSchema.safeParse({ ...validPlan, status });
      expect(result.success).toBe(true);
    }
  });
});
