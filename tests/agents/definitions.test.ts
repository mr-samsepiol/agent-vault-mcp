import { describe, it, expect } from "vitest";
import { AGENT_DEFINITIONS, getAgentDefinition, listAgentTypes } from "../../../src/agents/definitions.js";

describe("Agent Definitions", () => {
  it("should define all required agent types", () => {
    const types = listAgentTypes();
    expect(types).toContain("plan_creator");
    expect(types).toContain("plan_updater");
    expect(types).toContain("plan_validator");
    expect(types).toContain("plan_versioning");
    expect(types).toContain("plan_retrieval");
  });

  it("should have valid structure for each definition", () => {
    for (const def of AGENT_DEFINITIONS) {
      expect(def.type).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.tools.length).toBeGreaterThan(0);
      expect(def.responsibilities.length).toBeGreaterThan(0);
    }
  });

  it("should retrieve definition by type", () => {
    const creator = getAgentDefinition("plan_creator");
    expect(creator).toBeDefined();
    expect(creator!.name).toBe("PlanCreatorAgent");
    expect(creator!.tools).toContain("save_plan");
  });

  it("should return undefined for unknown type", () => {
    expect(getAgentDefinition("nonexistent")).toBeUndefined();
  });

  it("each agent should reference only existing MCP tools", () => {
    const knownTools = ["save_plan", "get_plan", "list_plans", "create_version", "validate_plan"];
    for (const def of AGENT_DEFINITIONS) {
      for (const tool of def.tools) {
        expect(knownTools).toContain(tool);
      }
    }
  });
});
