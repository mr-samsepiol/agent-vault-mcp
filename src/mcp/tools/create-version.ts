import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";
import { validatePlan } from "../../schema/plan-validator.js";
import { VersionManager } from "../../versioning/version-manager.js";

export const createVersionInputSchema = {
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID"),
  plan_id: z.string().describe("Existing plan ID to version"),
  plan: z.record(z.unknown()).describe("Updated plan document for the new version"),
};

export async function handleCreateVersion(input: { user_id: string; agent_id: string; plan_id: string; plan: unknown }, storage: StorageAdapter, _logger: Logger) {
  const validation = validatePlan(input.plan);
  if (!validation.success) {
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "Plan validation failed", details: validation.errors }) }], isError: true };
  }
  const key = { userId: input.user_id, agentId: input.agent_id, planId: input.plan_id };
  const meta = await storage.getMeta(key);
  if (!meta) {
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: `Plan not found: ${input.plan_id}` }) }], isError: true };
  }
  const newMeta = VersionManager.incrementVersion(meta);
  const savedPlan = { ...validation.data!, version: VersionManager.formatVersion(newMeta.currentVersion), metadata: { ...validation.data!.metadata, updated_at: new Date().toISOString() } };
  await storage.savePlan({ ...key, version: newMeta.currentVersion }, savedPlan);
  await storage.saveMeta(key, newMeta);
  return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, plan_id: input.plan_id, version: newMeta.currentVersion }) }] };
}
