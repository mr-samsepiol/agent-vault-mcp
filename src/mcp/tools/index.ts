import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";
import { handleSavePlan, savePlanInputSchema } from "./save-plan.js";
import { handleGetPlan, getPlanInputSchema } from "./get-plan.js";
import { handleListPlans, listPlansInputSchema } from "./list-plans.js";
import { handleCreateVersion, createVersionInputSchema } from "./create-version.js";
import { handleValidatePlan, validatePlanInputSchema } from "./validate-plan.js";

export function registerAllTools(server: McpServer, storage: StorageAdapter, logger: Logger): void {
  server.tool("save_plan", "Create a new agent plan or overwrite the latest version", savePlanInputSchema, (input) => handleSavePlan(input, storage, logger));
  server.tool("get_plan", "Retrieve a plan by ID. Returns latest version unless version is specified.", getPlanInputSchema, (input) => handleGetPlan(input, storage, logger));
  server.tool("list_plans", "List all plan IDs for a specific agent", listPlansInputSchema, (input) => handleListPlans(input, storage, logger));
  server.tool("create_version", "Create a new version of an existing plan", createVersionInputSchema, (input) => handleCreateVersion(input, storage, logger));
  server.tool("validate_plan", "Validate a plan document against the schema without saving", validatePlanInputSchema, (input) => handleValidatePlan(input, storage, logger));
}
