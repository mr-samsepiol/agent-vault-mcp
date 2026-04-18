import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";

export const listPlansInputSchema = z.object({
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID to list plans for"),
});

export async function handleListPlans(input: { user_id: string; agent_id: string }, storage: StorageAdapter, _logger: Logger) {
  const plans = await storage.listPlans(input.user_id, input.agent_id);
  return { content: [{ type: "text" as const, text: JSON.stringify({ plans }) }] };
}
