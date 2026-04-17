import { z } from "zod";

const GoalSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
});

const ToolRefSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  config: z.record(z.unknown()).default({}),
});

const ExecutionStepSchema = z.object({
  order: z.number().int().positive(),
  action: z.string().min(1),
  tool: z.string().optional(),
  input: z.record(z.unknown()).default({}),
  expected_output: z.string().optional(),
  on_failure: z.enum(["retry", "skip", "abort", "ask"]).default("abort"),
});

const MemorySchema = z.object({
  type: z.enum(["short_term", "long_term", "episodic", "semantic"]),
  capacity: z.string().default("unlimited"),
  persistence: z.enum(["session", "persistent", "permanent"]).default("session"),
  config: z.record(z.unknown()).default({}),
});

const TriggerSchema = z.object({
  type: z.enum(["event", "schedule", "condition", "manual"]),
  event: z.string().optional(),
  schedule: z.string().optional(),
  condition: z.string().optional(),
  action: z.enum(["execute_plan", "notify", "log", "pause"]),
});

const PlanMetadataSchema = z.object({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  author: z.string().min(1),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
});

export const PlanSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().min(1),
  version: z.string().min(1),
  status: z.enum(["draft", "active", "deprecated", "archived"]).default("active"),
  goals: z.array(GoalSchema).min(1),
  tools: z.array(ToolRefSchema).default([]),
  execution_steps: z.array(ExecutionStepSchema).default([]),
  memory: MemorySchema.default({
    type: "short_term",
    capacity: "unlimited",
    persistence: "session",
    config: {},
  }),
  triggers: z.array(TriggerSchema).default([]),
  metadata: PlanMetadataSchema,
});

export type Plan = z.infer<typeof PlanSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type ToolRef = z.infer<typeof ToolRefSchema>;
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type PlanMetadata = z.infer<typeof PlanMetadataSchema>;
