import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { MdPlanKey } from "../../storage/md-plan-types.js";
import type { Logger } from "../../utils/logger.js";
import type { WorkspaceManager } from "../../workspace/workspace-manager.js";

export const getMdPlanInputSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  project_name: z.string().min(1, "project_name is required").optional(),
  filename: z.string().min(1, "filename is required"),
});

export type GetMdPlanInput = z.infer<typeof getMdPlanInputSchema>;

export async function handleGetMdPlan(input: unknown, storage: StorageAdapter, logger: Logger, workspaceManager: WorkspaceManager) {
  const parsed = getMdPlanInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: errors }) }],
    };
  }

  const { user_id, filename } = parsed.data;
  const project_name = parsed.data.project_name ?? workspaceManager.get(user_id);
  if (!project_name) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "project_name is required — either pass it explicitly or call set_workspace first" }) }],
    };
  }
  const key: MdPlanKey = { userId: user_id, projectName: project_name, filename };

  try {
    const content = await storage.getMdPlan(key);
    if (content === null) {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ success: false, error: `MD plan "${filename}" not found` }) },
        ],
      };
    }
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true, content, filename, project_name }) },
      ],
    };
  } catch (error: any) {
    logger.error("Failed to get MD plan", { error: error.message });
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: false, error: "Failed to get MD plan" }) },
      ],
    };
  }
}
