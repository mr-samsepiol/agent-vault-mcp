export interface AgentDefinition {
  type: string;
  name: string;
  description: string;
  tools: string[];
  triggers: string[];
  responsibilities: string[];
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  { type: "plan_creator", name: "PlanCreatorAgent", description: "Generates new agent plans from requirements", tools: ["save_plan", "validate_plan"], triggers: ["user_request:create_plan"], responsibilities: ["Analyze requirements and define goals", "Select appropriate tools for the plan", "Define execution steps with failure handling", "Validate plan schema before saving"] },
  { type: "plan_updater", name: "PlanUpdaterAgent", description: "Modifies existing agent plans with new versions", tools: ["get_plan", "create_version", "validate_plan"], triggers: ["user_request:update_plan", "plan:needs_update"], responsibilities: ["Retrieve current plan version", "Apply targeted modifications", "Validate changes before creating version", "Create new version with updated content"] },
  { type: "plan_validator", name: "PlanValidatorAgent", description: "Ensures plan schema and logic validity", tools: ["validate_plan", "get_plan"], triggers: ["plan:before_save", "plan:scheduled_check"], responsibilities: ["Validate schema compliance", "Check execution step ordering and references", "Verify tool references are valid", "Ensure all goals have required fields"] },
  { type: "plan_versioning", name: "PlanVersioningAgent", description: "Handles plan version control and history", tools: ["create_version", "get_plan", "list_plans"], triggers: ["plan:version_requested", "plan:rollback"], responsibilities: ["Create versioned snapshots on changes", "Track complete version history", "Support rollback to previous versions", "Maintain latest pointer consistency"] },
  { type: "plan_retrieval", name: "PlanRetrievalAgent", description: "Fetches plans for execution or inspection", tools: ["get_plan", "list_plans"], triggers: ["agent:needs_plan", "user_request:view_plan"], responsibilities: ["Retrieve specific plans by ID and version", "List available plans per agent", "Return latest or specific version on demand", "Provide full plan context for execution"] },
];

export function getAgentDefinition(type: string): AgentDefinition | undefined {
  return AGENT_DEFINITIONS.find((d) => d.type === type);
}

export function listAgentTypes(): string[] {
  return AGENT_DEFINITIONS.map((d) => d.type);
}
