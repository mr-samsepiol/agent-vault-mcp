import { z } from "zod";
import type { WorkspaceManager } from "../../workspace/workspace-manager.js";
import type { Logger } from "../../utils/logger.js";

export const setWorkspaceInputSchema = z.object({
  project_name: z.string().min(1, "project_name is required"),
});

export type SetWorkspaceInput = z.infer<typeof setWorkspaceInputSchema>;

export async function handleSetWorkspace(input: unknown, workspaceManager: WorkspaceManager, logger: Logger) {
  const parsed = setWorkspaceInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: errors }) }],
    };
  }

  const { project_name } = parsed.data;
  workspaceManager.set(project_name);
  logger.info("Workspace set", { project_name });

  return {
    content: [
      { type: "text" as const, text: JSON.stringify({ success: true, workspace: project_name }) },
    ],
  };
}
