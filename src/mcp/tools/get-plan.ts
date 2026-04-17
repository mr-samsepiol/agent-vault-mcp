import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";

export const getPlanInputSchema = {
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID"),
  plan_id: z.string().describe("Plan ID to retrieve"),
  version: z.number().optional().describe("Specific version number. Omit for latest."),
};

export async function handleGetPlan(input: { user_id: string; agent_id: string; plan_id: string; version?: number }, storage: StorageAdapter, _logger: Logger) {
  try {
    const key = { userId: input.user_id, agentId: input.agent_id, planId: input.plan_id, version: input.version };
    const plan = await storage.getPlan(key);
    return { content: [{ type: "text" as const, text: JSON.stringify(plan) }] };
  } catch {
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: `Plan not found: ${input.plan_id}` }) }], isError: true };
  }
}
