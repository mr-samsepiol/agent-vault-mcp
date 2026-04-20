import type { McpServer } from "@modelcontextprotocol/server";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";
import type { WorkspaceManager } from "../../workspace/workspace-manager.js";
import { wrapZodSchema } from "../zod-schema.js";
import { handleSaveMdPlan, saveMdPlanInputSchema } from "./save-md-plan.js";
import { handleGetMdPlan, getMdPlanInputSchema } from "./get-md-plan.js";
import { handleListMdPlans, listMdPlansInputSchema } from "./list-md-plans.js";
import { handleListWorkspaces, listWorkspacesInputSchema } from "./list-workspaces.js";
import { handleSetWorkspace, setWorkspaceInputSchema } from "./set-workspace.js";

export function registerAllTools(server: McpServer, storage: StorageAdapter, logger: Logger, workspaceManager: WorkspaceManager): void {
  server.registerTool(
    "set_workspace",
    {
      description: "Set the active workspace for a user. After setting, save_md_plan, get_md_plan, and list_md_plans will use this workspace when project_name is omitted.",
      inputSchema: wrapZodSchema(setWorkspaceInputSchema),
    },
    (input) => handleSetWorkspace(input, workspaceManager, logger),
  );
  server.registerTool(
    "save_md_plan",
    {
      description:
        "Save a Markdown developer plan. project_name is optional if set_workspace was called. Defaults to repo name or parent directory name.",
      inputSchema: wrapZodSchema(saveMdPlanInputSchema),
    },
    (input) => handleSaveMdPlan(input, storage, logger, workspaceManager),
  );
  server.registerTool(
    "get_md_plan",
    {
      description: "Retrieve a Markdown developer plan by filename. project_name is optional if set_workspace was called.",
      inputSchema: wrapZodSchema(getMdPlanInputSchema),
    },
    (input) => handleGetMdPlan(input, storage, logger, workspaceManager),
  );
  server.registerTool(
    "list_md_plans",
    {
      description: "List all Markdown developer plans for a project. project_name is optional if set_workspace was called.",
      inputSchema: wrapZodSchema(listMdPlansInputSchema),
    },
    (input) => handleListMdPlans(input, storage, logger, workspaceManager),
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
