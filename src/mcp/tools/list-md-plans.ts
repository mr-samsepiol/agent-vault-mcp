import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";
import type { WorkspaceManager } from "../../workspace/workspace-manager.js";

export const listMdPlansInputSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  project_name: z.string().min(1, "project_name is required").optional(),
});

export type ListMdPlansInput = z.infer<typeof listMdPlansInputSchema>;

export async function handleListMdPlans(input: unknown, storage: StorageAdapter, logger: Logger, workspaceManager: WorkspaceManager) {
  const parsed = listMdPlansInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: errors }) }],
    };
  }

  const { user_id } = parsed.data;
  const project_name = parsed.data.project_name ?? workspaceManager.get(user_id);
  if (!project_name) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "project_name is required — either pass it explicitly or call set_workspace first" }) }],
    };
  }

  try {
    const plans = await storage.listMdPlans(user_id, project_name);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true, plans, project_name }) },
      ],
    };
  } catch (error: any) {
    logger.error("Failed to list MD plans", { error: error.message });
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: false, error: "Failed to list MD plans" }) },
      ],
    };
  }
}
