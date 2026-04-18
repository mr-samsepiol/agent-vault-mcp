import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";
import { validatePlan } from "../../schema/plan-validator.js";
import { VersionManager } from "../../versioning/version-manager.js";

export const savePlanInputSchema = z.object({
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID that owns this plan"),
  plan: z.record(z.unknown()).describe("The complete plan document"),
});

export type SavePlanInput = { user_id: string; agent_id: string; plan: unknown };

export async function handleSavePlan(input: SavePlanInput, storage: StorageAdapter, _logger: Logger) {
  const validation = validatePlan(input.plan);
  if (!validation.success) {
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "Plan validation failed", details: validation.errors }) }], isError: true };
  }
  const plan = validation.data!;
  const planId = plan.id;
  const key = { userId: input.user_id, agentId: input.agent_id, planId, version: 1 };
  const savedPlan = { ...plan, version: "1", metadata: { ...plan.metadata, updated_at: new Date().toISOString() } };
  await storage.savePlan(key, savedPlan);
  const meta = VersionManager.createInitialMeta(planId, input.agent_id, input.user_id);
  await storage.saveMeta({ userId: input.user_id, agentId: input.agent_id, planId }, meta);
  return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, plan_id: planId, version: 1 }) }] };
}
