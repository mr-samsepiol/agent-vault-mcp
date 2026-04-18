import { PlanSchema, type Plan } from "./plan-schema.js";

export interface ValidationResult {
  success: boolean;
  data?: Plan;
  errors?: Array<{ path: string; message: string }>;
}

export function validatePlan(input: unknown): ValidationResult {
  const result = PlanSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { success: false, errors };
}
