import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";
import { validatePlan } from "../../schema/plan-validator.js";

export const validatePlanInputSchema = z.object({
  plan: z.record(z.unknown()).describe("Plan document to validate against schema"),
});

export async function handleValidatePlan(input: { plan: unknown }, _storage: StorageAdapter, _logger: Logger) {
  const result = validatePlan(input.plan);
  if (result.success) {
    return { content: [{ type: "text" as const, text: JSON.stringify({ valid: true, data: result.data }) }] };
  }
  return { content: [{ type: "text" as const, text: JSON.stringify({ valid: false, errors: result.errors }) }], isError: true };
}
