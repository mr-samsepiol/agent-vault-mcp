import type { McpServer } from "@modelcontextprotocol/server";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";
import { wrapZodSchema } from "../zod-schema.js";
import { handleSaveMdPlan, saveMdPlanInputSchema } from "./save-md-plan.js";
import { handleGetMdPlan, getMdPlanInputSchema } from "./get-md-plan.js";
import { handleListMdPlans, listMdPlansInputSchema } from "./list-md-plans.js";
import { handleListWorkspaces, listWorkspacesInputSchema } from "./list-workspaces.js";

export function registerAllTools(server: McpServer, storage: StorageAdapter, logger: Logger): void {
  server.registerTool(
    "save_md_plan",
    {
      description:
        "Save a Markdown developer plan. project_name should be the git repo name if in a repository, or the parent directory name otherwise.",
      inputSchema: wrapZodSchema(saveMdPlanInputSchema),
    },
    (input) => handleSaveMdPlan(input, storage, logger),
  );
  server.registerTool(
    "get_md_plan",
    {
      description: "Retrieve a Markdown developer plan by filename and project name.",
      inputSchema: wrapZodSchema(getMdPlanInputSchema),
    },
    (input) => handleGetMdPlan(input, storage, logger),
  );
  server.registerTool(
    "list_md_plans",
    {
      description: "List all Markdown developer plans for a project.",
      inputSchema: wrapZodSchema(listMdPlansInputSchema),
    },
    (input) => handleListMdPlans(input, storage, logger),
  );
  server.registerTool(
    "list_workspaces",
    {
      description: "List all workspace (project) directories for a user. Returns project names that can be used as project_name in other tools.",
      inputSchema: wrapZodSchema(listWorkspacesInputSchema),
    },
    (input) => handleListWorkspaces(input, storage, logger),
  );
}
