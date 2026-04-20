import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { MdPlanKey } from "../../storage/md-plan-types.js";
import type { Logger } from "../../utils/logger.js";

export const saveMdPlanInputSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  project_name: z
    .string()
    .min(1, "project_name is required — use repo name if in a git repository, or parent directory name otherwise"),
  filename: z.string().min(1, "filename is required"),
  content: z.string().min(1, "content must not be empty"),
});

export type SaveMdPlanInput = z.infer<typeof saveMdPlanInputSchema>;

export async function handleSaveMdPlan(input: unknown, storage: StorageAdapter, logger: Logger) {
  const parsed = saveMdPlanInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: errors }) }],
    };
  }

  const { user_id, project_name, filename, content } = parsed.data;
  const key: MdPlanKey = { userId: user_id, projectName: project_name, filename };

  try {
    await storage.saveMdPlan(key, content);
    logger.info("MD plan saved", { user_id, project_name, filename });
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, filename, project_name }) }],
    };
  } catch (error: any) {
    logger.error("Failed to save MD plan", { error: error.message });
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: false, error: "Failed to save MD plan" }) },
      ],
    };
  }
}
