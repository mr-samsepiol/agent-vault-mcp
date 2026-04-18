import type { McpServer } from "@modelcontextprotocol/server";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";
import { wrapZodSchema } from "../zod-schema.js";
import { handleSavePlan, savePlanInputSchema } from "./save-plan.js";
import { handleGetPlan, getPlanInputSchema } from "./get-plan.js";
import { handleListPlans, listPlansInputSchema } from "./list-plans.js";
import { handleCreateVersion, createVersionInputSchema } from "./create-version.js";
import { handleValidatePlan, validatePlanInputSchema } from "./validate-plan.js";

export function registerAllTools(server: McpServer, storage: StorageAdapter, logger: Logger): void {
  server.registerTool(
    "save_plan",
    { description: "Create a new agent plan or overwrite the latest version", inputSchema: wrapZodSchema(savePlanInputSchema) },
    (input) => handleSavePlan(input, storage, logger),
  );
  server.registerTool(
    "get_plan",
    { description: "Retrieve a plan by ID. Returns latest version unless version is specified.", inputSchema: wrapZodSchema(getPlanInputSchema) },
    (input) => handleGetPlan(input, storage, logger),
  );
  server.registerTool(
    "list_plans",
    { description: "List all plan IDs for a specific agent", inputSchema: wrapZodSchema(listPlansInputSchema) },
    (input) => handleListPlans(input, storage, logger),
  );
  server.registerTool(
    "create_version",
    { description: "Create a new version of an existing plan", inputSchema: wrapZodSchema(createVersionInputSchema) },
    (input) => handleCreateVersion(input, storage, logger),
  );
  server.registerTool(
    "validate_plan",
    { description: "Validate a plan document against the schema without saving", inputSchema: wrapZodSchema(validatePlanInputSchema) },
    (input) => handleValidatePlan(input, storage, logger),
  );
}
