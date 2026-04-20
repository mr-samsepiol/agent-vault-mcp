import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";

export const listWorkspacesInputSchema = z.object({});

export type ListWorkspacesInput = z.infer<typeof listWorkspacesInputSchema>;

export async function handleListWorkspaces(input: unknown, storage: StorageAdapter, logger: Logger) {
  try {
    const workspaces = await storage.listWorkspaces();
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
