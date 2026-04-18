# AgentVault MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready MCP server for creating, storing, versioning, and retrieving AI agent plans using S3-compatible object storage.

**Architecture:** TypeScript MCP server using `@modelcontextprotocol/sdk` with a storage adapter pattern over S3-compatible backends (R2/S3/MinIO). Plans are versioned JSON documents stored with explicit versioning. Zod validates all schemas. The server exposes MCP tools that AI agents call to manage their operational knowledge.

**Tech Stack:** Node.js 20+, TypeScript 5.x, @modelcontextprotocol/sdk, @aws-sdk/client-s3, Zod, Vitest, tsup, aws-sdk-client-mock

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `package.json` | Project manifest with deps and scripts |
| `tsconfig.json` | TypeScript compiler config |
| `tsup.config.ts` | Build config |
| `vitest.config.ts` | Test runner config |
| `.env.example` | Environment variable template |
| `src/config/index.ts` | Configuration loading & validation |
| `src/utils/errors.ts` | Custom error types |
| `src/utils/logger.ts` | Structured logging |
| `src/schema/plan-schema.ts` | Zod schema for agent plans |
| `src/schema/plan-validator.ts` | Plan validation logic |
| `src/storage/storage-adapter.ts` | Storage adapter interface + in-memory impl |
| `src/storage/s3-adapter.ts` | S3/R2/MinIO implementation |
| `src/versioning/version-manager.ts` | Version control logic |
| `src/mcp/server.ts` | MCP server setup |
| `src/mcp/tools/save-plan.ts` | save_plan tool |
| `src/mcp/tools/get-plan.ts` | get_plan tool |
| `src/mcp/tools/list-plans.ts` | list_plans tool |
| `src/mcp/tools/create-version.ts` | create_version tool |
| `src/mcp/tools/validate-plan.ts` | validate_plan tool |
| `src/mcp/tools/index.ts` | Tool registration hub |
| `src/agents/definitions.ts` | Agent type definitions |
| `src/security/access-control.ts` | Access control |
| `src/index.ts` | Entry point |
| `tests/config/config.test.ts` | Config tests |
| `tests/utils/errors.test.ts` | Error type tests |
| `tests/schema/plan-schema.test.ts` | Schema tests |
| `tests/schema/plan-validator.test.ts` | Validator tests |
| `tests/storage/storage-adapter.test.ts` | Adapter contract tests |
| `tests/storage/s3-adapter.test.ts` | S3 adapter tests |
| `tests/versioning/version-manager.test.ts` | Versioning tests |
| `tests/mcp/tools/save-plan.test.ts` | save_plan handler tests |
| `tests/mcp/tools/get-plan.test.ts` | get_plan handler tests |
| `tests/mcp/tools/list-plans.test.ts` | list_plans handler tests |
| `tests/mcp/tools/create-version.test.ts` | create_version handler tests |
| `tests/mcp/tools/validate-plan.test.ts` | validate_plan handler tests |
| `tests/agents/definitions.test.ts` | Agent definition tests |
| `tests/security/access-control.test.ts` | Access control tests |
| `tests/integration/full-flow.test.ts` | End-to-end lifecycle tests |

### Existing Files Modified

| File | Change |
|------|--------|
| `.gitignore` | Add node_modules, dist, .env, coverage |

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "agent-vault-mcp",
  "version": "0.1.0",
  "description": "MCP server for AI agent plan management with S3-compatible storage",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "agent-vault-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.750.0",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "dotenv": "^16.4.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "aws-sdk-client-mock": "^4.0.0",
    "tsup": "^8.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
});
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
    },
  },
});
```

- [ ] **Step 5: Create .env.example**

```
S3_ENDPOINT=https://your-r2-endpoint.com
S3_REGION=auto
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=agent-vault
LOG_LEVEL=info
```

- [ ] **Step 6: Update .gitignore**

Append these lines to the existing `.gitignore`:

```
node_modules/
dist/
.env
coverage/
*.tsbuildinfo
```

- [ ] **Step 7: Install dependencies and verify build**

Run: `npm install`
Expected: Dependencies installed, `package-lock.json` created

Run: `npx tsc --noEmit`
Expected: No errors (no source files yet)

- [ ] **Step 8: Commit**

```bash
git checkout -b feature/project-scaffolding
git add package.json tsconfig.json tsup.config.ts vitest.config.ts .env.example .gitignore package-lock.json
git commit -m "feat: scaffold project with TypeScript, MCP SDK, S3 client, Zod, Vitest"
```

---

### Task 2: Configuration Module

**Files:**
- Create: `src/config/index.ts`
- Create: `tests/config/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/config/config.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadConfig } from "../../../src/config/index.js";

describe("loadConfig", () => {
  it("should load valid configuration from env", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_REGION: "auto",
      S3_ACCESS_KEY_ID: "test-key",
      S3_SECRET_ACCESS_KEY: "test-secret",
      S3_BUCKET: "test-bucket",
      LOG_LEVEL: "debug",
    });

    expect(config.S3_ENDPOINT).toBe("https://r2.example.com");
    expect(config.S3_REGION).toBe("auto");
    expect(config.S3_ACCESS_KEY_ID).toBe("test-key");
    expect(config.S3_BUCKET).toBe("test-bucket");
    expect(config.LOG_LEVEL).toBe("debug");
  });

  it("should apply defaults for optional fields", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_ACCESS_KEY_ID: "test-key",
      S3_SECRET_ACCESS_KEY: "test-secret",
    });

    expect(config.S3_REGION).toBe("auto");
    expect(config.S3_BUCKET).toBe("agent-vault");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("should throw on missing required fields", () => {
    expect(() => loadConfig({})).toThrow();
  });

  it("should throw on invalid endpoint URL", () => {
    expect(() =>
      loadConfig({
        S3_ENDPOINT: "not-a-url",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config/config.test.ts`
Expected: FAIL — cannot find module `../../../src/config/index.js`

- [ ] **Step 3: Write implementation**

Create `src/config/index.ts`:

```typescript
import { z } from "zod";

const configSchema = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().default("agent-vault"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(
  env?: Record<string, string | undefined>,
): Config {
  const source = env ?? process.env;
  return configSchema.parse({
    S3_ENDPOINT: source.S3_ENDPOINT,
    S3_REGION: source.S3_REGION,
    S3_ACCESS_KEY_ID: source.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: source.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: source.S3_BUCKET,
    LOG_LEVEL: source.LOG_LEVEL,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config/config.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/index.ts tests/config/config.test.ts
git commit -m "feat: add configuration module with Zod validation"
```

---

### Task 3: Error Types & Logger

**Files:**
- Create: `src/utils/errors.ts`
- Create: `src/utils/logger.ts`
- Create: `tests/utils/errors.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/errors.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  VaultError,
  PlanNotFoundError,
  PlanValidationError,
  StorageError,
  VersionConflictError,
} from "../../../src/utils/errors.js";

describe("VaultError", () => {
  it("should set name from constructor", () => {
    const error = new VaultError("test");
    expect(error.name).toBe("VaultError");
    expect(error.message).toBe("test");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("PlanNotFoundError", () => {
  it("should include plan ID in message", () => {
    const error = new PlanNotFoundError("plan-123");
    expect(error.name).toBe("PlanNotFoundError");
    expect(error.message).toContain("plan-123");
  });
});

describe("PlanValidationError", () => {
  it("should store validation error details", () => {
    const details = [{ path: "goals", message: "required" }];
    const error = new PlanValidationError("validation failed", details);
    expect(error.name).toBe("PlanValidationError");
    expect(error.details).toEqual(details);
  });
});

describe("StorageError", () => {
  it("should wrap cause", () => {
    const cause = new Error("connection refused");
    const error = new StorageError("S3 operation failed", cause);
    expect(error.name).toBe("StorageError");
    expect(error.cause).toBe(cause);
  });
});

describe("VersionConflictError", () => {
  it("should include version info", () => {
    const error = new VersionConflictError("plan-123", 2, 3);
    expect(error.name).toBe("VersionConflictError");
    expect(error.message).toContain("plan-123");
    expect(error.message).toContain("2");
    expect(error.message).toContain("3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/errors.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write error types**

Create `src/utils/errors.ts`:

```typescript
export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PlanNotFoundError extends VaultError {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`);
  }
}

export class PlanValidationError extends VaultError {
  details: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    details: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.details = details;
  }
}

export class StorageError extends VaultError {
  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

export class VersionConflictError extends VaultError {
  constructor(planId: string, expected: number, actual: number) {
    super(
      `Version conflict for plan ${planId}: expected v${expected}, found v${actual}`,
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/errors.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Create logger utility**

Create `src/utils/logger.ts`:

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog("debug")) {
      console.error(`[DEBUG] ${message}`, data ?? "");
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog("info")) {
      console.error(`[INFO] ${message}`, data ?? "");
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog("warn")) {
      console.error(`[WARN] ${message}`, data ?? "");
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog("error")) {
      console.error(`[ERROR] ${message}`, data ?? "");
    }
  }
}
```

Note: Logging goes to `stderr` to avoid interfering with MCP's stdio transport (which uses `stdout`).

- [ ] **Step 6: Commit**

```bash
git add src/utils/errors.ts src/utils/logger.ts tests/utils/errors.test.ts
git commit -m "feat: add error types and structured logger"
```

---

### Task 4: Plan Schema

**Files:**
- Create: `src/schema/plan-schema.ts`
- Create: `src/schema/plan-validator.ts`
- Create: `tests/schema/plan-schema.test.ts`
- Create: `tests/schema/plan-validator.test.ts`

- [ ] **Step 1: Write the failing schema tests**

Create `tests/schema/plan-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PlanSchema } from "../../../src/schema/plan-schema.js";

const validPlan = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  agent_id: "agent-001",
  version: "1",
  status: "active",
  goals: [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      description: "Search the web for information",
      priority: "high",
      status: "pending",
    },
  ],
  tools: [
    { name: "web_search", purpose: "Search the internet", config: {} },
  ],
  execution_steps: [
    {
      order: 1,
      action: "Perform web search",
      tool: "web_search",
      input: { query: "{{user_query}}" },
      expected_output: "Search results",
      on_failure: "retry",
    },
  ],
  memory: {
    type: "short_term",
    capacity: "10_items",
    persistence: "session",
    config: {},
  },
  triggers: [
    {
      type: "event",
      event: "user_message",
      action: "execute_plan",
    },
  ],
  metadata: {
    created_at: "2026-04-17T00:00:00Z",
    updated_at: "2026-04-17T00:00:00Z",
    author: "system",
    tags: ["search", "web"],
    description: "A web search agent plan",
  },
};

describe("PlanSchema", () => {
  it("should validate a complete valid plan", () => {
    const result = PlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it("should reject plan without id", () => {
    const { id, ...noId } = validPlan;
    expect(PlanSchema.safeParse(noId).success).toBe(false);
  });

  it("should reject plan without agent_id", () => {
    const { agent_id, ...noAgent } = validPlan;
    expect(PlanSchema.safeParse(noAgent).success).toBe(false);
  });

  it("should reject invalid UUID for id", () => {
    const result = PlanSchema.safeParse({ ...validPlan, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("should reject empty goals array", () => {
    const result = PlanSchema.safeParse({ ...validPlan, goals: [] });
    expect(result.success).toBe(false);
  });

  it("should apply defaults for optional fields", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      agent_id: "agent-001",
      version: "1",
      goals: [
        {
          id: "660e8400-e29b-41d4-a716-446655440001",
          description: "Do something",
          priority: "medium" as const,
          status: "pending" as const,
        },
      ],
      metadata: {
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
        author: "system",
      },
    };

    const result = PlanSchema.parse(minimal);
    expect(result.tools).toEqual([]);
    expect(result.execution_steps).toEqual([]);
    expect(result.triggers).toEqual([]);
    expect(result.status).toBe("active");
    expect(result.memory.type).toBe("short_term");
  });

  it("should reject invalid status value", () => {
    const result = PlanSchema.safeParse({ ...validPlan, status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid priority in goals", () => {
    const plan = {
      ...validPlan,
      goals: [{ ...validPlan.goals[0], priority: "urgent" }],
    };
    expect(PlanSchema.safeParse(plan).success).toBe(false);
  });

  it("should accept all valid status values", () => {
    for (const status of ["draft", "active", "deprecated", "archived"] as const) {
      const result = PlanSchema.safeParse({ ...validPlan, status });
      expect(result.success).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schema/plan-schema.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write the plan schema**

Create `src/schema/plan-schema.ts`:

```typescript
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
```

- [ ] **Step 4: Run schema test to verify it passes**

Run: `npx vitest run tests/schema/plan-schema.test.ts`
Expected: 9 tests PASS

- [ ] **Step 5: Write the failing validator test**

Create `tests/schema/plan-validator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validatePlan } from "../../../src/schema/plan-validator.js";

describe("validatePlan", () => {
  it("should return success with data for valid plan", () => {
    const plan = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      agent_id: "agent-001",
      version: "1",
      goals: [
        {
          id: "660e8400-e29b-41d4-a716-446655440001",
          description: "Test goal",
          priority: "high",
          status: "pending",
        },
      ],
      metadata: {
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
        author: "system",
      },
    };

    const result = validatePlan(plan);
    expect(result.success).toBe(true);
    expect(result.data?.agent_id).toBe("agent-001");
    expect(result.data?.status).toBe("active");
  });

  it("should return errors for invalid plan", () => {
    const result = validatePlan({ id: "bad" });
    expect(result.success).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("should include path information in errors", () => {
    const result = validatePlan({
      id: "550e8400-e29b-41d4-a716-446655440000",
      agent_id: "agent-1",
      version: "1",
      goals: [],
      metadata: {
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
        author: "system",
      },
    });
    expect(result.success).toBe(false);
    const goalError = result.errors!.find((e) => e.path.includes("goals"));
    expect(goalError).toBeDefined();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/schema/plan-validator.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 7: Write the validator**

Create `src/schema/plan-validator.ts`:

```typescript
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
```

- [ ] **Step 8: Run all schema tests**

Run: `npx vitest run tests/schema/`
Expected: All 12 tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/schema/ tests/schema/
git commit -m "feat: add plan schema with Zod validation and validator module"
```

---

### Task 5: Storage Adapter Interface

**Files:**
- Create: `src/storage/storage-adapter.ts`
- Create: `tests/storage/storage-adapter.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/storage/storage-adapter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  type StorageKey,
  type PlanMeta,
  InMemoryStorageAdapter,
} from "../../../src/storage/storage-adapter.js";

const testKey: StorageKey = {
  userId: "user-1",
  agentId: "agent-1",
  planId: "plan-1",
};

const testMeta: PlanMeta = {
  planId: "plan-1",
  agentId: "agent-1",
  userId: "user-1",
  currentVersion: 1,
  versions: [1],
  createdAt: "2026-04-17T00:00:00Z",
  updatedAt: "2026-04-17T00:00:00Z",
};

describe("InMemoryStorageAdapter", () => {
  it("should save and retrieve a plan", async () => {
    const storage = new InMemoryStorageAdapter();
    const data = { test: "data" };

    await storage.savePlan({ ...testKey, version: 1 }, data);
    const result = await storage.getPlan(testKey);

    expect(result).toEqual(data);
  });

  it("should update latest when saving new version", async () => {
    const storage = new InMemoryStorageAdapter();
    const v1 = { version: 1 };
    const v2 = { version: 2 };

    await storage.savePlan({ ...testKey, version: 1 }, v1);
    await storage.savePlan({ ...testKey, version: 2 }, v2);

    const latest = await storage.getPlan(testKey);
    expect(latest).toEqual(v2);
  });

  it("should retrieve a specific version", async () => {
    const storage = new InMemoryStorageAdapter();
    const v1 = { version: 1 };
    const v2 = { version: 2 };

    await storage.savePlan({ ...testKey, version: 1 }, v1);
    await storage.savePlan({ ...testKey, version: 2 }, v2);

    const result = await storage.getPlan({ ...testKey, version: 1 });
    expect(result).toEqual(v1);
  });

  it("should save and retrieve metadata", async () => {
    const storage = new InMemoryStorageAdapter();

    await storage.saveMeta(testKey, testMeta);
    const meta = await storage.getMeta(testKey);

    expect(meta).toEqual(testMeta);
  });

  it("should return null for missing metadata", async () => {
    const storage = new InMemoryStorageAdapter();
    const meta = await storage.getMeta(testKey);
    expect(meta).toBeNull();
  });

  it("should list plan IDs for an agent", async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.savePlan({ ...testKey, planId: "plan-a", version: 1 }, {});
    await storage.savePlan({ ...testKey, planId: "plan-b", version: 1 }, {});
    await storage.savePlan({ ...testKey, planId: "plan-c", version: 1 }, {});

    const plans = await storage.listPlans("user-1", "agent-1");
    expect(plans.sort()).toEqual(["plan-a", "plan-b", "plan-c"]);
  });

  it("should return empty array when no plans exist", async () => {
    const storage = new InMemoryStorageAdapter();
    const plans = await storage.listPlans("user-1", "agent-1");
    expect(plans).toEqual([]);
  });

  it("should delete a plan and its metadata", async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.savePlan({ ...testKey, version: 1 }, { data: "test" });
    await storage.saveMeta(testKey, testMeta);

    await storage.deletePlan(testKey);

    const meta = await storage.getMeta(testKey);
    expect(meta).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage/storage-adapter.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write the storage adapter interface with in-memory implementation**

Create `src/storage/storage-adapter.ts`:

```typescript
export interface StorageKey {
  userId: string;
  agentId: string;
  planId: string;
  version?: number;
}

export interface PlanMeta {
  planId: string;
  agentId: string;
  userId: string;
  currentVersion: number;
  versions: number[];
  createdAt: string;
  updatedAt: string;
}

export interface StorageAdapter {
  savePlan(key: StorageKey, data: unknown): Promise<void>;
  getPlan(key: StorageKey): Promise<unknown>;
  listPlans(userId: string, agentId: string): Promise<string[]>;
  getMeta(key: StorageKey): Promise<PlanMeta | null>;
  saveMeta(key: StorageKey, meta: PlanMeta): Promise<void>;
  deletePlan(key: StorageKey): Promise<void>;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>();
  private metaStore = new Map<string, PlanMeta>();

  private latestKey(k: StorageKey): string {
    return `vault/${k.userId}/${k.agentId}/plans/${k.planId}/latest.json`;
  }

  private versionKey(k: StorageKey): string {
    return `vault/${k.userId}/${k.agentId}/plans/${k.planId}/versions/v${k.version}.json`;
  }

  private metaKey(k: StorageKey): string {
    return `vault/${k.userId}/${k.agentId}/plans/${k.planId}/meta.json`;
  }

  async savePlan(key: StorageKey, data: unknown): Promise<void> {
    if (key.version) {
      this.store.set(this.versionKey(key), data);
    }
    this.store.set(this.latestKey(key), data);
  }

  async getPlan(key: StorageKey): Promise<unknown> {
    const k = key.version ? this.versionKey(key) : this.latestKey(key);
    const data = this.store.get(k);
    if (data === undefined) {
      throw new Error(`Plan not found at key: ${k}`);
    }
    return data;
  }

  async listPlans(userId: string, agentId: string): Promise<string[]> {
    const prefix = `vault/${userId}/${agentId}/plans/`;
    const planIds = new Set<string>();
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        const parts = key.replace(prefix, "").split("/");
        planIds.add(parts[0]);
      }
    }
    return [...planIds];
  }

  async getMeta(key: StorageKey): Promise<PlanMeta | null> {
    return this.metaStore.get(this.metaKey(key)) ?? null;
  }

  async saveMeta(key: StorageKey, meta: PlanMeta): Promise<void> {
    this.metaStore.set(this.metaKey(key), meta);
  }

  async deletePlan(key: StorageKey): Promise<void> {
    const prefix = `vault/${key.userId}/${key.agentId}/plans/${key.planId}/`;
    for (const k of [...this.store.keys()]) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
    this.metaStore.delete(this.metaKey(key));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/storage/storage-adapter.test.ts`
Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/storage-adapter.ts tests/storage/storage-adapter.test.ts
git commit -m "feat: add storage adapter interface with in-memory implementation"
```

---

### Task 6: S3 Adapter

**Files:**
- Create: `src/storage/s3-adapter.ts`
- Create: `tests/storage/s3-adapter.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/storage/s3-adapter.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { S3StorageAdapter } from "../../../src/storage/s3-adapter.js";
import type { StorageKey, PlanMeta } from "../../../src/storage/storage-adapter.js";

const s3Mock = mockClient(S3Client);

const testKey: StorageKey = {
  userId: "user-1",
  agentId: "agent-1",
  planId: "plan-1",
};

const testMeta: PlanMeta = {
  planId: "plan-1",
  agentId: "agent-1",
  userId: "user-1",
  currentVersion: 1,
  versions: [1],
  createdAt: "2026-04-17T00:00:00Z",
  updatedAt: "2026-04-17T00:00:00Z",
};

function createAdapter(): S3StorageAdapter {
  return new S3StorageAdapter({
    endpoint: "https://r2.example.com",
    region: "auto",
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
    bucket: "test-bucket",
  });
}

describe("S3StorageAdapter", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it("should save a plan as both versioned and latest copy", async () => {
    const adapter = createAdapter();
    s3Mock.on(PutObjectCommand).resolves({});

    await adapter.savePlan({ ...testKey, version: 1 }, { data: "test" });

    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls.length).toBe(2);
    expect(calls[0].args[0].input.Key).toContain("versions/v1.json");
    expect(calls[1].args[0].input.Key).toContain("latest.json");
  });

  it("should save only latest when no version specified", async () => {
    const adapter = createAdapter();
    s3Mock.on(PutObjectCommand).resolves({});

    await adapter.savePlan(testKey, { data: "test" });

    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls.length).toBe(1);
    expect(calls[0].args[0].input.Key).toContain("latest.json");
  });

  it("should get latest plan when no version specified", async () => {
    const adapter = createAdapter();
    const planData = { id: "plan-1", version: "1" };
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: () => Promise.resolve(JSON.stringify(planData)),
      } as any,
    });

    const result = await adapter.getPlan(testKey);
    expect(result).toEqual(planData);

    const call = s3Mock.commandCalls(GetObjectCommand)[0];
    expect(call.args[0].input.Key).toContain("latest.json");
  });

  it("should get specific version when version is set", async () => {
    const adapter = createAdapter();
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: () => Promise.resolve(JSON.stringify({ v: 1 })),
      } as any,
    });

    await adapter.getPlan({ ...testKey, version: 1 });

    const call = s3Mock.commandCalls(GetObjectCommand)[0];
    expect(call.args[0].input.Key).toContain("versions/v1.json");
  });

  it("should list plans by common prefixes", async () => {
    const adapter = createAdapter();
    s3Mock.on(ListObjectsV2Command).resolves({
      CommonPrefixes: [
        { Prefix: "vault/user-1/agent-1/plans/plan-1/" },
        { Prefix: "vault/user-1/agent-1/plans/plan-2/" },
      ],
    });

    const plans = await adapter.listPlans("user-1", "agent-1");
    expect(plans).toEqual(["plan-1", "plan-2"]);
  });

  it("should return empty array when no plans exist", async () => {
    const adapter = createAdapter();
    s3Mock.on(ListObjectsV2Command).resolves({});

    const plans = await adapter.listPlans("user-1", "agent-1");
    expect(plans).toEqual([]);
  });

  it("should save and retrieve metadata", async () => {
    const adapter = createAdapter();
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: () =>
          Promise.resolve(JSON.stringify(testMeta)),
      } as any,
    });

    await adapter.saveMeta(testKey, testMeta);
    const meta = await adapter.getMeta(testKey);

    expect(meta).toEqual(testMeta);
  });

  it("should return null for missing metadata (NoSuchKey)", async () => {
    const adapter = createAdapter();
    const error = new Error("Not Found") as any;
    error.name = "NoSuchKey";
    s3Mock.on(GetObjectCommand).rejects(error);

    const meta = await adapter.getMeta(testKey);
    expect(meta).toBeNull();
  });

  it("should delete all plan objects under prefix", async () => {
    const adapter = createAdapter();
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        { Key: "vault/user-1/agent-1/plans/plan-1/meta.json" },
        { Key: "vault/user-1/agent-1/plans/plan-1/latest.json" },
        { Key: "vault/user-1/agent-1/plans/plan-1/versions/v1.json" },
      ],
    });
    s3Mock.on(DeleteObjectCommand).resolves({});

    await adapter.deletePlan(testKey);

    const deleteCalls = s3Mock.commandCalls(DeleteObjectCommand);
    expect(deleteCalls.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage/s3-adapter.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write the S3 adapter**

Create `src/storage/s3-adapter.ts`:

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { StorageAdapter, StorageKey, PlanMeta } from "./storage-adapter.js";
import { StorageError } from "../utils/errors.js";

export interface S3AdapterConfig {
  endpoint: string;
  region: string;
  credentials: { accessKeyId: string; secretAccessKey: string };
  bucket: string;
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3AdapterConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: config.credentials,
    });
    this.bucket = config.bucket;
  }

  private prefix(k: StorageKey): string {
    return `vault/${k.userId}/${k.agentId}/plans/${k.planId}`;
  }

  private versionKey(k: StorageKey): string {
    return `${this.prefix(k)}/versions/v${k.version}.json`;
  }

  private latestKey(k: StorageKey): string {
    return `${this.prefix(k)}/latest.json`;
  }

  private metaKey(k: StorageKey): string {
    return `${this.prefix(k)}/meta.json`;
  }

  async savePlan(key: StorageKey, data: unknown): Promise<void> {
    try {
      const body = JSON.stringify(data, null, 2);
      if (key.version) {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: this.versionKey(key),
            Body: body,
            ContentType: "application/json",
          }),
        );
      }
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.latestKey(key),
          Body: body,
          ContentType: "application/json",
        }),
      );
    } catch (error) {
      throw new StorageError("Failed to save plan", error as Error);
    }
  }

  async getPlan(key: StorageKey): Promise<unknown> {
    try {
      const s3Key = key.version ? this.versionKey(key) : this.latestKey(key);
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      );
      const body = await response.Body!.transformToString();
      return JSON.parse(body);
    } catch (error) {
      throw new StorageError("Failed to get plan", error as Error);
    }
  }

  async listPlans(userId: string, agentId: string): Promise<string[]> {
    try {
      const prefix = `vault/${userId}/${agentId}/plans/`;
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          Delimiter: "/",
        }),
      );
      return (response.CommonPrefixes ?? []).map((p) => {
        const parts = p.Prefix!.split("/").filter(Boolean);
        return parts[parts.length - 1];
      });
    } catch (error) {
      throw new StorageError("Failed to list plans", error as Error);
    }
  }

  async getMeta(key: StorageKey): Promise<PlanMeta | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.metaKey(key),
        }),
      );
      const body = await response.Body!.transformToString();
      return JSON.parse(body) as PlanMeta;
    } catch (error: any) {
      if (
        error.name === "NoSuchKey" ||
        error.Code === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      throw new StorageError("Failed to get metadata", error as Error);
    }
  }

  async saveMeta(key: StorageKey, meta: PlanMeta): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.metaKey(key),
          Body: JSON.stringify(meta, null, 2),
          ContentType: "application/json",
        }),
      );
    } catch (error) {
      throw new StorageError("Failed to save metadata", error as Error);
    }
  }

  async deletePlan(key: StorageKey): Promise<void> {
    try {
      const prefix = this.prefix(key);
      const listResponse = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        }),
      );
      for (const obj of listResponse.Contents ?? []) {
        await this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: obj.Key!,
          }),
        );
      }
    } catch (error) {
      throw new StorageError("Failed to delete plan", error as Error);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/storage/s3-adapter.test.ts`
Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/s3-adapter.ts tests/storage/s3-adapter.test.ts
git commit -m "feat: add S3 storage adapter with R2/S3/MinIO support"
```

---

### Task 7: MCP Server Foundation & Entry Point

**Files:**
- Create: `src/mcp/server.ts`
- Create: `src/index.ts`
- Create: `tests/mcp/server.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/mcp/server.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createVaultServer } from "../../../src/mcp/server.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";

describe("createVaultServer", () => {
  it("should create an MCP server instance", () => {
    const storage = new InMemoryStorageAdapter();
    const server = createVaultServer({ storage });
    expect(server).toBeDefined();
  });

  it("should accept custom name and version", () => {
    const storage = new InMemoryStorageAdapter();
    const server = createVaultServer({
      storage,
      name: "custom-vault",
      version: "2.0.0",
    });
    expect(server).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/server.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write the MCP server factory**

Create `src/mcp/server.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageAdapter } from "../storage/storage-adapter.js";
import { Logger } from "../utils/logger.js";
import { registerAllTools } from "./tools/index.js";

export interface VaultServerOptions {
  storage: StorageAdapter;
  name?: string;
  version?: string;
  logger?: Logger;
}

export function createVaultServer(options: VaultServerOptions): McpServer {
  const logger = options.logger ?? new Logger();

  const server = new McpServer({
    name: options.name ?? "agent-vault-mcp",
    version: options.version ?? "0.1.0",
  });

  registerAllTools(server, options.storage, logger);

  return server;
}
```

- [ ] **Step 4: Create the tool registration stub**

Create `src/mcp/tools/index.ts`:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";

export function registerAllTools(
  _server: McpServer,
  _storage: StorageAdapter,
  _logger: Logger,
): void {
  // Tools will be registered here in Phase 2 tasks
}
```

- [ ] **Step 5: Create the entry point**

Create `src/index.ts`:

```typescript
#!/usr/bin/env node

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/index.js";
import { S3StorageAdapter } from "./storage/s3-adapter.js";
import { createVaultServer } from "./mcp/server.js";
import { Logger } from "./utils/logger.js";

async function main() {
  const config = loadConfig();
  const logger = new Logger(config.LOG_LEVEL);

  const storage = new S3StorageAdapter({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
    bucket: config.S3_BUCKET,
  });

  const server = createVaultServer({ storage, logger });
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("AgentVault MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/mcp/server.test.ts`
Expected: 2 tests PASS

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/mcp/server.ts src/mcp/tools/index.ts src/index.ts tests/mcp/server.test.ts
git commit -m "feat: add MCP server factory, tool registration stub, and entry point"
```

---

## Phase 2: Tools & Versioning

### Task 8: Version Manager

**Files:**
- Create: `src/versioning/version-manager.ts`
- Create: `tests/versioning/version-manager.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/versioning/version-manager.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { VersionManager } from "../../../src/versioning/version-manager.js";
import type { PlanMeta } from "../../../src/storage/storage-adapter.js";

describe("VersionManager", () => {
  it("should create initial metadata", () => {
    const meta = VersionManager.createInitialMeta(
      "plan-1",
      "agent-1",
      "user-1",
    );
    expect(meta.planId).toBe("plan-1");
    expect(meta.agentId).toBe("agent-1");
    expect(meta.userId).toBe("user-1");
    expect(meta.currentVersion).toBe(1);
    expect(meta.versions).toEqual([1]);
    expect(meta.createdAt).toBeDefined();
    expect(meta.updatedAt).toBeDefined();
  });

  it("should increment version", () => {
    const base: PlanMeta = {
      planId: "plan-1",
      agentId: "agent-1",
      userId: "user-1",
      currentVersion: 2,
      versions: [1, 2],
      createdAt: "2026-04-17T00:00:00Z",
      updatedAt: "2026-04-17T00:00:00Z",
    };

    const next = VersionManager.incrementVersion(base);
    expect(next.currentVersion).toBe(3);
    expect(next.versions).toEqual([1, 2, 3]);
    expect(next.updatedAt).not.toBe(base.updatedAt);
  });

  it("should preserve immutable fields on increment", () => {
    const base: PlanMeta = {
      planId: "plan-1",
      agentId: "agent-1",
      userId: "user-1",
      currentVersion: 1,
      versions: [1],
      createdAt: "2026-04-17T00:00:00Z",
      updatedAt: "2026-04-17T00:00:00Z",
    };

    const next = VersionManager.incrementVersion(base);
    expect(next.planId).toBe(base.planId);
    expect(next.agentId).toBe(base.agentId);
    expect(next.userId).toBe(base.userId);
    expect(next.createdAt).toBe(base.createdAt);
  });

  it("should check if version exists", () => {
    const meta: PlanMeta = {
      planId: "plan-1",
      agentId: "agent-1",
      userId: "user-1",
      currentVersion: 3,
      versions: [1, 2, 3],
      createdAt: "2026-04-17T00:00:00Z",
      updatedAt: "2026-04-17T00:00:00Z",
    };

    expect(VersionManager.versionExists(meta, 1)).toBe(true);
    expect(VersionManager.versionExists(meta, 3)).toBe(true);
    expect(VersionManager.versionExists(meta, 4)).toBe(false);
  });

  it("should format version number as string", () => {
    expect(VersionManager.formatVersion(1)).toBe("1");
    expect(VersionManager.formatVersion(12)).toBe("12");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/versioning/version-manager.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/versioning/version-manager.ts`:

```typescript
import type { PlanMeta } from "../storage/storage-adapter.js";

export class VersionManager {
  static createInitialMeta(
    planId: string,
    agentId: string,
    userId: string,
  ): PlanMeta {
    const now = new Date().toISOString();
    return {
      planId,
      agentId,
      userId,
      currentVersion: 1,
      versions: [1],
      createdAt: now,
      updatedAt: now,
    };
  }

  static incrementVersion(meta: PlanMeta): PlanMeta {
    const nextVersion = meta.currentVersion + 1;
    return {
      ...meta,
      currentVersion: nextVersion,
      versions: [...meta.versions, nextVersion],
      updatedAt: new Date().toISOString(),
    };
  }

  static versionExists(meta: PlanMeta, version: number): boolean {
    return meta.versions.includes(version);
  }

  static formatVersion(version: number): string {
    return String(version);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/versioning/version-manager.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/versioning/version-manager.ts tests/versioning/version-manager.test.ts
git commit -m "feat: add version manager for plan versioning logic"
```

---

### Task 9: save_plan Tool

**Files:**
- Create: `src/mcp/tools/save-plan.ts`
- Create: `tests/mcp/tools/save-plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/mcp/tools/save-plan.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { handleSavePlan } from "../../../src/mcp/tools/save-plan.js";
import {
  InMemoryStorageAdapter,
  type StorageAdapter,
} from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleSavePlan", () => {
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
  });

  const validPlan = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    agent_id: "agent-001",
    version: "1",
    goals: [
      {
        id: "660e8400-e29b-41d4-a716-446655440001",
        description: "Test goal",
        priority: "high" as const,
        status: "pending" as const,
      },
    ],
    metadata: {
      created_at: "2026-04-17T00:00:00Z",
      updated_at: "2026-04-17T00:00:00Z",
      author: "test",
    },
  };

  it("should save a valid plan and return success", async () => {
    const result = await handleSavePlan(
      { user_id: "user-1", agent_id: "agent-001", plan: validPlan },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.plan_id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(parsed.version).toBe(1);
    expect(result.isError).toBeFalsy();
  });

  it("should persist the plan in storage", async () => {
    await handleSavePlan(
      { user_id: "user-1", agent_id: "agent-001", plan: validPlan },
      storage,
      new Logger(),
    );

    const stored = await storage.getPlan({
      userId: "user-1",
      agentId: "agent-001",
      planId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(stored).toBeDefined();
  });

  it("should persist metadata in storage", async () => {
    await handleSavePlan(
      { user_id: "user-1", agent_id: "agent-001", plan: validPlan },
      storage,
      new Logger(),
    );

    const meta = await storage.getMeta({
      userId: "user-1",
      agentId: "agent-001",
      planId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(meta).not.toBeNull();
    expect(meta!.currentVersion).toBe(1);
    expect(meta!.versions).toEqual([1]);
  });

  it("should reject an invalid plan with error details", async () => {
    const result = await handleSavePlan(
      { user_id: "user-1", agent_id: "agent-001", plan: { id: "bad" } },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe("Plan validation failed");
    expect(parsed.details.length).toBeGreaterThan(0);
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/save-plan.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/mcp/tools/save-plan.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";
import { validatePlan } from "../../schema/plan-validator.js";
import { VersionManager } from "../../versioning/version-manager.js";

export const savePlanInputSchema = {
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID that owns this plan"),
  plan: z.record(z.unknown()).describe("The complete plan document"),
};

export type SavePlanInput = {
  user_id: string;
  agent_id: string;
  plan: unknown;
};

export async function handleSavePlan(
  input: SavePlanInput,
  storage: StorageAdapter,
  _logger: Logger,
) {
  const validation = validatePlan(input.plan);
  if (!validation.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Plan validation failed",
            details: validation.errors,
          }),
        },
      ],
      isError: true,
    };
  }

  const plan = validation.data!;
  const planId = plan.id;
  const key = {
    userId: input.user_id,
    agentId: input.agent_id,
    planId,
    version: 1,
  };

  const savedPlan = {
    ...plan,
    version: "1",
    metadata: {
      ...plan.metadata,
      updated_at: new Date().toISOString(),
    },
  };

  await storage.savePlan(key, savedPlan);

  const meta = VersionManager.createInitialMeta(
    planId,
    input.agent_id,
    input.user_id,
  );
  await storage.saveMeta(
    { userId: input.user_id, agentId: input.agent_id, planId },
    meta,
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          plan_id: planId,
          version: 1,
        }),
      },
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp/tools/save-plan.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/mcp/tools/save-plan.ts tests/mcp/tools/save-plan.test.ts
git commit -m "feat: add save_plan MCP tool handler"
```

---

### Task 10: get_plan Tool

**Files:**
- Create: `src/mcp/tools/get-plan.ts`
- Create: `tests/mcp/tools/get-plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/mcp/tools/get-plan.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { handleGetPlan } from "../../../src/mcp/tools/get-plan.js";
import {
  InMemoryStorageAdapter,
  type StorageAdapter,
} from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleGetPlan", () => {
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
  });

  it("should retrieve latest plan when no version specified", async () => {
    await storage.savePlan(
      {
        userId: "user-1",
        agentId: "agent-1",
        planId: "plan-1",
        version: 1,
      },
      { id: "plan-1", version: "1" },
    );

    const result = await handleGetPlan(
      { user_id: "user-1", agent_id: "agent-1", plan_id: "plan-1" },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.version).toBe("1");
  });

  it("should retrieve specific version when version is set", async () => {
    await storage.savePlan(
      {
        userId: "user-1",
        agentId: "agent-1",
        planId: "plan-1",
        version: 1,
      },
      { id: "plan-1", version: "1" },
    );
    await storage.savePlan(
      {
        userId: "user-1",
        agentId: "agent-1",
        planId: "plan-1",
        version: 2,
      },
      { id: "plan-1", version: "2" },
    );

    const result = await handleGetPlan(
      {
        user_id: "user-1",
        agent_id: "agent-1",
        plan_id: "plan-1",
        version: 1,
      },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.version).toBe("1");
  });

  it("should return error for missing plan", async () => {
    const result = await handleGetPlan(
      { user_id: "user-1", agent_id: "agent-1", plan_id: "nonexistent" },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("not found");
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/get-plan.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/mcp/tools/get-plan.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";

export const getPlanInputSchema = {
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID"),
  plan_id: z.string().describe("Plan ID to retrieve"),
  version: z
    .number()
    .optional()
    .describe("Specific version number. Omit for latest."),
};

export async function handleGetPlan(
  input: {
    user_id: string;
    agent_id: string;
    plan_id: string;
    version?: number;
  },
  storage: StorageAdapter,
  _logger: Logger,
) {
  try {
    const key = {
      userId: input.user_id,
      agentId: input.agent_id,
      planId: input.plan_id,
      version: input.version,
    };
    const plan = await storage.getPlan(key);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(plan),
        },
      ],
    };
  } catch {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: `Plan not found: ${input.plan_id}`,
          }),
        },
      ],
      isError: true,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp/tools/get-plan.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/mcp/tools/get-plan.ts tests/mcp/tools/get-plan.test.ts
git commit -m "feat: add get_plan MCP tool handler"
```

---

### Task 11: list_plans Tool

**Files:**
- Create: `src/mcp/tools/list-plans.ts`
- Create: `tests/mcp/tools/list-plans.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/mcp/tools/list-plans.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { handleListPlans } from "../../../src/mcp/tools/list-plans.js";
import {
  InMemoryStorageAdapter,
  type StorageAdapter,
} from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleListPlans", () => {
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
  });

  it("should return plan IDs for an agent", async () => {
    await storage.savePlan(
      { userId: "user-1", agentId: "agent-1", planId: "plan-a", version: 1 },
      {},
    );
    await storage.savePlan(
      { userId: "user-1", agentId: "agent-1", planId: "plan-b", version: 1 },
      {},
    );

    const result = await handleListPlans(
      { user_id: "user-1", agent_id: "agent-1" },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.plans.sort()).toEqual(["plan-a", "plan-b"]);
  });

  it("should return empty array when no plans exist", async () => {
    const result = await handleListPlans(
      { user_id: "user-1", agent_id: "agent-1" },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.plans).toEqual([]);
  });

  it("should only list plans for the specified agent", async () => {
    await storage.savePlan(
      { userId: "user-1", agentId: "agent-1", planId: "plan-a", version: 1 },
      {},
    );
    await storage.savePlan(
      { userId: "user-1", agentId: "agent-2", planId: "plan-b", version: 1 },
      {},
    );

    const result = await handleListPlans(
      { user_id: "user-1", agent_id: "agent-1" },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.plans).toEqual(["plan-a"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/list-plans.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/mcp/tools/list-plans.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";

export const listPlansInputSchema = {
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID to list plans for"),
};

export async function handleListPlans(
  input: { user_id: string; agent_id: string },
  storage: StorageAdapter,
  _logger: Logger,
) {
  const plans = await storage.listPlans(input.user_id, input.agent_id);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ plans }),
      },
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp/tools/list-plans.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/mcp/tools/list-plans.ts tests/mcp/tools/list-plans.test.ts
git commit -m "feat: add list_plans MCP tool handler"
```

---

### Task 12: create_version Tool

**Files:**
- Create: `src/mcp/tools/create-version.ts`
- Create: `tests/mcp/tools/create-version.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/mcp/tools/create-version.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { handleCreateVersion } from "../../../src/mcp/tools/create-version.js";
import {
  InMemoryStorageAdapter,
  type StorageAdapter,
  type PlanMeta,
} from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleCreateVersion", () => {
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
  });

  const validPlan = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    agent_id: "agent-001",
    version: "2",
    goals: [
      {
        id: "660e8400-e29b-41d4-a716-446655440001",
        description: "Updated goal",
        priority: "high" as const,
        status: "pending" as const,
      },
    ],
    metadata: {
      created_at: "2026-04-17T00:00:00Z",
      updated_at: "2026-04-17T00:00:00Z",
      author: "test",
    },
  };

  it("should create a new version of an existing plan", async () => {
    const existingMeta: PlanMeta = {
      planId: "550e8400-e29b-41d4-a716-446655440000",
      agentId: "agent-001",
      userId: "user-1",
      currentVersion: 1,
      versions: [1],
      createdAt: "2026-04-17T00:00:00Z",
      updatedAt: "2026-04-17T00:00:00Z",
    };
    await storage.saveMeta(
      {
        userId: "user-1",
        agentId: "agent-001",
        planId: "550e8400-e29b-41d4-a716-446655440000",
      },
      existingMeta,
    );

    const result = await handleCreateVersion(
      {
        user_id: "user-1",
        agent_id: "agent-001",
        plan_id: "550e8400-e29b-41d4-a716-446655440000",
        plan: validPlan,
      },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.version).toBe(2);

    const meta = await storage.getMeta({
      userId: "user-1",
      agentId: "agent-001",
      planId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(meta!.currentVersion).toBe(2);
    expect(meta!.versions).toEqual([1, 2]);
  });

  it("should reject invalid plan", async () => {
    const result = await handleCreateVersion(
      {
        user_id: "user-1",
        agent_id: "agent-001",
        plan_id: "plan-1",
        plan: { bad: "data" },
      },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(result.isError).toBe(true);
  });

  it("should return error when plan does not exist", async () => {
    const result = await handleCreateVersion(
      {
        user_id: "user-1",
        agent_id: "agent-001",
        plan_id: "550e8400-e29b-41d4-a716-446655440000",
        plan: validPlan,
      },
      storage,
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("not found");
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/create-version.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/mcp/tools/create-version.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";
import { validatePlan } from "../../schema/plan-validator.js";
import { VersionManager } from "../../versioning/version-manager.js";

export const createVersionInputSchema = {
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID"),
  plan_id: z.string().describe("Existing plan ID to version"),
  plan: z
    .record(z.unknown())
    .describe("Updated plan document for the new version"),
};

export async function handleCreateVersion(
  input: {
    user_id: string;
    agent_id: string;
    plan_id: string;
    plan: unknown;
  },
  storage: StorageAdapter,
  _logger: Logger,
) {
  const validation = validatePlan(input.plan);
  if (!validation.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Plan validation failed",
            details: validation.errors,
          }),
        },
      ],
      isError: true,
    };
  }

  const key = {
    userId: input.user_id,
    agentId: input.agent_id,
    planId: input.plan_id,
  };
  const meta = await storage.getMeta(key);
  if (!meta) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: `Plan not found: ${input.plan_id}`,
          }),
        },
      ],
      isError: true,
    };
  }

  const newMeta = VersionManager.incrementVersion(meta);
  const savedPlan = {
    ...validation.data!,
    version: VersionManager.formatVersion(newMeta.currentVersion),
    metadata: {
      ...validation.data!.metadata,
      updated_at: new Date().toISOString(),
    },
  };

  await storage.savePlan({ ...key, version: newMeta.currentVersion }, savedPlan);
  await storage.saveMeta(key, newMeta);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          plan_id: input.plan_id,
          version: newMeta.currentVersion,
        }),
      },
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp/tools/create-version.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/mcp/tools/create-version.ts tests/mcp/tools/create-version.test.ts
git commit -m "feat: add create_version MCP tool handler"
```

---

### Task 13: validate_plan Tool

**Files:**
- Create: `src/mcp/tools/validate-plan.ts`
- Create: `tests/mcp/tools/validate-plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/mcp/tools/validate-plan.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { handleValidatePlan } from "../../../src/mcp/tools/validate-plan.js";
import {
  InMemoryStorageAdapter,
} from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("handleValidatePlan", () => {
  it("should return valid for a correct plan", async () => {
    const validPlan = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      agent_id: "agent-001",
      version: "1",
      goals: [
        {
          id: "660e8400-e29b-41d4-a716-446655440001",
          description: "Test",
          priority: "high",
          status: "pending",
        },
      ],
      metadata: {
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
        author: "system",
      },
    };

    const result = await handleValidatePlan(
      { plan: validPlan },
      new InMemoryStorageAdapter(),
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(true);
    expect(parsed.data.agent_id).toBe("agent-001");
  });

  it("should return errors for an invalid plan", async () => {
    const result = await handleValidatePlan(
      { plan: { bad: true } },
      new InMemoryStorageAdapter(),
      new Logger(),
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/validate-plan.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/mcp/tools/validate-plan.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";
import { validatePlan } from "../../schema/plan-validator.js";

export const validatePlanInputSchema = {
  plan: z
    .record(z.unknown())
    .describe("Plan document to validate against schema"),
};

export async function handleValidatePlan(
  input: { plan: unknown },
  _storage: StorageAdapter,
  _logger: Logger,
) {
  const result = validatePlan(input.plan);
  if (result.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ valid: true, data: result.data }),
        },
      ],
    };
  }
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ valid: false, errors: result.errors }),
      },
    ],
    isError: true,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp/tools/validate-plan.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/mcp/tools/validate-plan.ts tests/mcp/tools/validate-plan.test.ts
git commit -m "feat: add validate_plan MCP tool handler"
```

---

### Task 14: Wire All Tools into Server

**Files:**
- Modify: `src/mcp/tools/index.ts`
- Create: `tests/mcp/tools/registration.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/mcp/tools/registration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "../../../src/mcp/tools/index.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";

describe("registerAllTools", () => {
  it("should register all tools without errors", () => {
    const server = new McpServer({ name: "test", version: "0.1.0" });
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger();

    expect(() => registerAllTools(server, storage, logger)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/registration.test.ts`
Expected: Should already pass (stub exists), but tools are not yet registered

- [ ] **Step 3: Update tool registration to wire all tools**

Replace `src/mcp/tools/index.ts` with:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";
import {
  handleSavePlan,
  savePlanInputSchema,
} from "./save-plan.js";
import {
  handleGetPlan,
  getPlanInputSchema,
} from "./get-plan.js";
import {
  handleListPlans,
  listPlansInputSchema,
} from "./list-plans.js";
import {
  handleCreateVersion,
  createVersionInputSchema,
} from "./create-version.js";
import {
  handleValidatePlan,
  validatePlanInputSchema,
} from "./validate-plan.js";

export function registerAllTools(
  server: McpServer,
  storage: StorageAdapter,
  logger: Logger,
): void {
  server.tool(
    "save_plan",
    "Create a new agent plan or overwrite the latest version",
    savePlanInputSchema,
    (input) => handleSavePlan(input, storage, logger),
  );

  server.tool(
    "get_plan",
    "Retrieve a plan by ID. Returns latest version unless version is specified.",
    getPlanInputSchema,
    (input) => handleGetPlan(input, storage, logger),
  );

  server.tool(
    "list_plans",
    "List all plan IDs for a specific agent",
    listPlansInputSchema,
    (input) => handleListPlans(input, storage, logger),
  );

  server.tool(
    "create_version",
    "Create a new version of an existing plan",
    createVersionInputSchema,
    (input) => handleCreateVersion(input, storage, logger),
  );

  server.tool(
    "validate_plan",
    "Validate a plan document against the schema without saving",
    validatePlanInputSchema,
    (input) => handleValidatePlan(input, storage, logger),
  );
}
```

- [ ] **Step 4: Run all tests to verify everything passes**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/mcp/tools/index.ts tests/mcp/tools/registration.test.ts
git commit -m "feat: wire all MCP tools into server registration"
```

---

## Phase 3: Agents, Security & Polish

### Task 15: Agent Definitions

**Files:**
- Create: `src/agents/definitions.ts`
- Create: `tests/agents/definitions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/agents/definitions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  AGENT_DEFINITIONS,
  getAgentDefinition,
  listAgentTypes,
  type AgentDefinition,
} from "../../../src/agents/definitions.js";

describe("Agent Definitions", () => {
  it("should define all required agent types", () => {
    const types = listAgentTypes();
    expect(types).toContain("plan_creator");
    expect(types).toContain("plan_updater");
    expect(types).toContain("plan_validator");
    expect(types).toContain("plan_versioning");
    expect(types).toContain("plan_retrieval");
  });

  it("should have valid structure for each definition", () => {
    for (const def of AGENT_DEFINITIONS) {
      expect(def.type).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.tools.length).toBeGreaterThan(0);
      expect(def.responsibilities.length).toBeGreaterThan(0);
    }
  });

  it("should retrieve definition by type", () => {
    const creator = getAgentDefinition("plan_creator");
    expect(creator).toBeDefined();
    expect(creator!.name).toBe("PlanCreatorAgent");
    expect(creator!.tools).toContain("save_plan");
  });

  it("should return undefined for unknown type", () => {
    expect(getAgentDefinition("nonexistent")).toBeUndefined();
  });

  it("each agent should reference only existing MCP tools", () => {
    const knownTools = [
      "save_plan",
      "get_plan",
      "list_plans",
      "create_version",
      "validate_plan",
    ];
    for (const def of AGENT_DEFINITIONS) {
      for (const tool of def.tools) {
        expect(knownTools).toContain(tool);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/agents/definitions.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/agents/definitions.ts`:

```typescript
export interface AgentDefinition {
  type: string;
  name: string;
  description: string;
  tools: string[];
  triggers: string[];
  responsibilities: string[];
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    type: "plan_creator",
    name: "PlanCreatorAgent",
    description: "Generates new agent plans from requirements",
    tools: ["save_plan", "validate_plan"],
    triggers: ["user_request:create_plan"],
    responsibilities: [
      "Analyze requirements and define goals",
      "Select appropriate tools for the plan",
      "Define execution steps with failure handling",
      "Validate plan schema before saving",
    ],
  },
  {
    type: "plan_updater",
    name: "PlanUpdaterAgent",
    description: "Modifies existing agent plans with new versions",
    tools: ["get_plan", "create_version", "validate_plan"],
    triggers: ["user_request:update_plan", "plan:needs_update"],
    responsibilities: [
      "Retrieve current plan version",
      "Apply targeted modifications",
      "Validate changes before creating version",
      "Create new version with updated content",
    ],
  },
  {
    type: "plan_validator",
    name: "PlanValidatorAgent",
    description: "Ensures plan schema and logic validity",
    tools: ["validate_plan", "get_plan"],
    triggers: ["plan:before_save", "plan:scheduled_check"],
    responsibilities: [
      "Validate schema compliance",
      "Check execution step ordering and references",
      "Verify tool references are valid",
      "Ensure all goals have required fields",
    ],
  },
  {
    type: "plan_versioning",
    name: "PlanVersioningAgent",
    description: "Handles plan version control and history",
    tools: ["create_version", "get_plan", "list_plans"],
    triggers: ["plan:version_requested", "plan:rollback"],
    responsibilities: [
      "Create versioned snapshots on changes",
      "Track complete version history",
      "Support rollback to previous versions",
      "Maintain latest pointer consistency",
    ],
  },
  {
    type: "plan_retrieval",
    name: "PlanRetrievalAgent",
    description: "Fetches plans for execution or inspection",
    tools: ["get_plan", "list_plans"],
    triggers: ["agent:needs_plan", "user_request:view_plan"],
    responsibilities: [
      "Retrieve specific plans by ID and version",
      "List available plans per agent",
      "Return latest or specific version on demand",
      "Provide full plan context for execution",
    ],
  },
];

export function getAgentDefinition(type: string): AgentDefinition | undefined {
  return AGENT_DEFINITIONS.find((d) => d.type === type);
}

export function listAgentTypes(): string[] {
  return AGENT_DEFINITIONS.map((d) => d.type);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/agents/definitions.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/agents/definitions.ts tests/agents/definitions.test.ts
git commit -m "feat: add agent type definitions for all plan lifecycle agents"
```

---

### Task 16: Access Control

**Files:**
- Create: `src/security/access-control.ts`
- Create: `tests/security/access-control.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/security/access-control.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { AccessControl } from "../../../src/security/access-control.js";

describe("AccessControl", () => {
  it("should allow owner to access their own plan", async () => {
    const ac = new AccessControl();
    const allowed = await ac.canAccessPlan(
      { userId: "user-1" },
      "user-1",
    );
    expect(allowed).toBe(true);
  });

  it("should deny access to another user's plan", async () => {
    const ac = new AccessControl();
    const allowed = await ac.canAccessPlan(
      { userId: "user-2" },
      "user-1",
    );
    expect(allowed).toBe(false);
  });

  it("should allow owner to modify their own plan", async () => {
    const ac = new AccessControl();
    const allowed = await ac.canModifyPlan(
      { userId: "user-1", agentId: "agent-1" },
      "user-1",
      "agent-1",
    );
    expect(allowed).toBe(true);
  });

  it("should deny modification of another user's plan", async () => {
    const ac = new AccessControl();
    const allowed = await ac.canModifyPlan(
      { userId: "user-2" },
      "user-1",
      "agent-1",
    );
    expect(allowed).toBe(false);
  });

  it("should deny modification from wrong agent", async () => {
    const ac = new AccessControl();
    const allowed = await ac.canModifyPlan(
      { userId: "user-1", agentId: "agent-2" },
      "user-1",
      "agent-1",
    );
    expect(allowed).toBe(false);
  });

  it("should allow modification without agent context", async () => {
    const ac = new AccessControl();
    const allowed = await ac.canModifyPlan(
      { userId: "user-1" },
      "user-1",
      "agent-1",
    );
    expect(allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/security/access-control.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/security/access-control.ts`:

```typescript
export interface AccessContext {
  userId: string;
  agentId?: string;
}

export class AccessControl {
  async canAccessPlan(
    context: AccessContext,
    planUserId: string,
  ): Promise<boolean> {
    return context.userId === planUserId;
  }

  async canModifyPlan(
    context: AccessContext,
    planUserId: string,
    planAgentId: string,
  ): Promise<boolean> {
    if (context.userId !== planUserId) return false;
    if (context.agentId && context.agentId !== planAgentId) return false;
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/security/access-control.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/security/access-control.ts tests/security/access-control.test.ts
git commit -m "feat: add access control with user and agent-level permissions"
```

---

### Task 17: Integration Tests

**Files:**
- Create: `tests/integration/full-flow.test.ts`

- [ ] **Step 1: Write integration tests**

Create `tests/integration/full-flow.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { VersionManager } from "../../../src/versioning/version-manager.js";
import { validatePlan } from "../../../src/schema/plan-validator.js";
import { handleSavePlan } from "../../../src/mcp/tools/save-plan.js";
import { handleGetPlan } from "../../../src/mcp/tools/get-plan.js";
import { handleListPlans } from "../../../src/mcp/tools/list-plans.js";
import { handleCreateVersion } from "../../../src/mcp/tools/create-version.js";
import { handleValidatePlan } from "../../../src/mcp/tools/validate-plan.js";
import { Logger } from "../../../src/utils/logger.js";

const testPlan = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  agent_id: "agent-001",
  version: "1",
  goals: [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      description: "Perform data analysis",
      priority: "high" as const,
      status: "pending" as const,
    },
  ],
  tools: [{ name: "data_query", purpose: "Query data sources", config: {} }],
  execution_steps: [
    {
      order: 1,
      action: "Query database",
      tool: "data_query",
      input: { table: "users" },
      expected_output: "Result set",
      on_failure: "retry" as const,
    },
  ],
  triggers: [
    { type: "event" as const, event: "schedule", action: "execute_plan" as const },
  ],
  metadata: {
    created_at: "2026-04-17T00:00:00Z",
    updated_at: "2026-04-17T00:00:00Z",
    author: "integration-test",
    tags: ["data", "analysis"],
  },
};

describe("Full lifecycle integration", () => {
  it("should complete create -> validate -> save -> get -> version -> list flow", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    // Step 1: Validate before saving
    const validation = await handleValidatePlan(
      { plan: testPlan },
      storage,
      logger,
    );
    const validationResult = JSON.parse(validation.content[0].text);
    expect(validationResult.valid).toBe(true);

    // Step 2: Save the plan
    const saveResult = await handleSavePlan(
      { user_id: "user-1", agent_id: "agent-001", plan: testPlan },
      storage,
      logger,
    );
    const saved = JSON.parse(saveResult.content[0].text);
    expect(saved.success).toBe(true);
    expect(saved.version).toBe(1);

    // Step 3: Retrieve the plan
    const getResult = await handleGetPlan(
      {
        user_id: "user-1",
        agent_id: "agent-001",
        plan_id: testPlan.id,
      },
      storage,
      logger,
    );
    const retrieved = JSON.parse(getResult.content[0].text);
    expect(retrieved.agent_id).toBe("agent-001");
    expect(retrieved.version).toBe("1");

    // Step 4: Create a new version
    const updatedPlan = {
      ...testPlan,
      goals: [
        ...testPlan.goals,
        {
          id: "660e8400-e29b-41d4-a716-446655440002",
          description: "Generate report",
          priority: "medium" as const,
          status: "pending" as const,
        },
      ],
    };
    const versionResult = await handleCreateVersion(
      {
        user_id: "user-1",
        agent_id: "agent-001",
        plan_id: testPlan.id,
        plan: updatedPlan,
      },
      storage,
      logger,
    );
    const versioned = JSON.parse(versionResult.content[0].text);
    expect(versioned.success).toBe(true);
    expect(versioned.version).toBe(2);

    // Step 5: Get specific version
    const v1 = await handleGetPlan(
      {
        user_id: "user-1",
        agent_id: "agent-001",
        plan_id: testPlan.id,
        version: 1,
      },
      storage,
      logger,
    );
    const v1Data = JSON.parse(v1.content[0].text);
    expect(v1Data.version).toBe("1");
    expect(v1Data.goals.length).toBe(1);

    // Step 6: Get latest (v2)
    const latest = await handleGetPlan(
      {
        user_id: "user-1",
        agent_id: "agent-001",
        plan_id: testPlan.id,
      },
      storage,
      logger,
    );
    const latestData = JSON.parse(latest.content[0].text);
    expect(latestData.version).toBe("2");
    expect(latestData.goals.length).toBe(2);

    // Step 7: List plans
    const listResult = await handleListPlans(
      { user_id: "user-1", agent_id: "agent-001" },
      storage,
      logger,
    );
    const listed = JSON.parse(listResult.content[0].text);
    expect(listed.plans).toContain(testPlan.id);
  });

  it("should reject versioning of nonexistent plan", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    const result = await handleCreateVersion(
      {
        user_id: "user-1",
        agent_id: "agent-001",
        plan_id: "nonexistent-id",
        plan: testPlan,
      },
      storage,
      logger,
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `npx vitest run tests/integration/full-flow.test.ts`
Expected: 2 tests PASS

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS across all modules

- [ ] **Step 4: Commit**

```bash
git add tests/integration/full-flow.test.ts
git commit -m "test: add integration tests for full plan lifecycle"
```

---

### Task 18: Update README & Build Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README.md**

Read the existing `README.md`, then replace its contents with:

```markdown
# AgentVault MCP

MCP server for storing, versioning, and managing AI agent plans on S3-compatible object storage (R2, S3, MinIO).

Agents interact through MCP tools to securely create, update, and retrieve their own execution context in a structured way.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your S3/R2 credentials

# Build
npm run build

# Run
npm start
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `save_plan` | Create a new agent plan |
| `get_plan` | Retrieve a plan (latest or specific version) |
| `list_plans` | List all plan IDs for an agent |
| `create_version` | Create a new version of an existing plan |
| `validate_plan` | Validate a plan document without saving |

## Plan Schema

Every plan follows a strict JSON schema:

```json
{
  "id": "uuid",
  "agent_id": "string",
  "version": "1",
  "status": "active | draft | deprecated | archived",
  "goals": [{ "id": "uuid", "description": "...", "priority": "high|medium|low|critical", "status": "pending|in_progress|completed|failed" }],
  "tools": [{ "name": "...", "purpose": "...", "config": {} }],
  "execution_steps": [{ "order": 1, "action": "...", "tool": "...", "input": {}, "on_failure": "retry|skip|abort|ask" }],
  "memory": { "type": "short_term|long_term|episodic|semantic", "capacity": "...", "persistence": "session|persistent|permanent" },
  "triggers": [{ "type": "event|schedule|condition|manual", "action": "execute_plan|notify|log|pause" }],
  "metadata": { "created_at": "...", "updated_at": "...", "author": "...", "tags": [] }
}
```

## Storage Layout

```
vault/{userId}/{agentId}/plans/{planId}/
  ├── latest.json
  ├── meta.json
  └── versions/
      ├── v1.json
      └── v2.json
```

## Agent Types

| Agent | Purpose | Tools Used |
|-------|---------|------------|
| PlanCreatorAgent | Generate new plans | `save_plan`, `validate_plan` |
| PlanUpdaterAgent | Modify existing plans | `get_plan`, `create_version`, `validate_plan` |
| PlanValidatorAgent | Ensure plan validity | `validate_plan`, `get_plan` |
| PlanVersioningAgent | Handle version control | `create_version`, `get_plan`, `list_plans` |
| PlanRetrievalAgent | Fetch plans for execution | `get_plan`, `list_plans` |

## Development

```bash
npm run dev          # Run with hot reload
npm test             # Run tests
npm run test:watch   # Watch mode
npm run build        # Production build
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `S3_ENDPOINT` | Yes | - | S3-compatible endpoint URL |
| `S3_REGION` | No | `auto` | Storage region |
| `S3_ACCESS_KEY_ID` | Yes | - | Access key |
| `S3_SECRET_ACCESS_KEY` | Yes | - | Secret key |
| `S3_BUCKET` | No | `agent-vault` | Bucket name |
| `LOG_LEVEL` | No | `info` | debug, info, warn, error |

## License

MIT
```

- [ ] **Step 2: Verify full build**

Run: `npm run build`
Expected: Build succeeds, `dist/` directory created

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README with full usage documentation"
```

---

## Git Workflow Summary

Per the project spec:

1. **All work happens on feature branches** branched from `develop`
2. **Each task should be its own feature branch** (e.g., `feature/plan-schema`, `feature/s3-adapter`)
3. **Open PRs into `develop`** after each task is complete
4. **Squash merge** for clean history on `develop`

Suggested branch names per task:

| Task | Branch |
|------|--------|
| 1 | `feature/project-scaffolding` |
| 2 | `feature/config-module` |
| 3 | `feature/error-types-logger` |
| 4 | `feature/plan-schema` |
| 5 | `feature/storage-adapter` |
| 6 | `feature/s3-adapter` |
| 7 | `feature/mcp-server-foundation` |
| 8 | `feature/version-manager` |
| 9 | `feature/save-plan-tool` |
| 10 | `feature/get-plan-tool` |
| 11 | `feature/list-plans-tool` |
| 12 | `feature/create-version-tool` |
| 13 | `feature/validate-plan-tool` |
| 14 | `feature/tool-registration` |
| 15 | `feature/agent-definitions` |
| 16 | `feature/access-control` |
| 17 | `feature/integration-tests` |
| 18 | `feature/readme-update` |
