import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";

export const listWorkspacesInputSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
});

export type ListWorkspacesInput = z.infer<typeof listWorkspacesInputSchema>;

export async function handleListWorkspaces(input: unknown, storage: StorageAdapter, logger: Logger) {
  const parsed = listWorkspacesInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: errors }) }],
    };
  }

  const { user_id } = parsed.data;

  try {
    const workspaces = await storage.listWorkspaces(user_id);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true, workspaces }) },
      ],
    };
  } catch (error: any) {
    logger.error("Failed to list workspaces", { error: error.message });
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: false, error: "Failed to list workspaces" }) },
      ],
    };
  }
}
