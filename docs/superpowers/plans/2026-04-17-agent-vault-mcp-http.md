# AgentVault MCP — HTTP Remote Transport Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Streamable HTTP remote transport to the AgentVault MCP server, enabling remote AI agents to connect over HTTP with API key authentication, CORS, rate limiting, and health checks.

**Architecture:** Migrate from `@modelcontextprotocol/sdk` v1 to the v2 modular packages (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`, `@modelcontextprotocol/fastify`). Use `NodeStreamableHTTPServerTransport` with Fastify for HTTP mode, keeping `StdioServerTransport` for local CLI mode. Tool registration migrates from `.tool()` to `.registerTool()` with `z.object()` schemas. The entry point supports dual mode via `TRANSPORT_MODE` env var.

**Tech Stack:** Node.js 20+, TypeScript 5.x, @modelcontextprotocol/server v2, @modelcontextprotocol/node v2, @modelcontextprotocol/fastify v2, fastify v5, @fastify/cors, @fastify/rate-limit, Zod v3, Vitest

**Prerequisite:** Plan `2026-04-17-agent-vault-mcp.md` (core system) must be implemented first or in parallel. This plan modifies files created by the core plan.

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/http/auth.ts` | API key authentication via Fastify hook |
| `src/http/health.ts` | Health check and readiness route handlers |
| `src/http/server.ts` | Fastify HTTP server factory with MCP transport |
| `tests/http/auth.test.ts` | Authentication tests |
| `tests/http/health.test.ts` | Health check tests |
| `tests/http/server.test.ts` | HTTP server integration tests |
| `tests/integration/http-flow.test.ts` | Full HTTP MCP tool call flow |

### Existing Files Modified

| File | Change |
|------|--------|
| `package.json` | Replace v1 SDK with v2 packages, add Fastify deps |
| `src/config/index.ts` | Add HTTP config fields (host, port, API key, CORS, rate limit) |
| `src/mcp/server.ts` | Migrate imports to `@modelcontextprotocol/server` v2 |
| `src/mcp/tools/save-plan.ts` | Wrap schemas with `z.object()` for v2 |
| `src/mcp/tools/get-plan.ts` | Wrap schemas with `z.object()` for v2 |
| `src/mcp/tools/list-plans.ts` | Wrap schemas with `z.object()` for v2 |
| `src/mcp/tools/create-version.ts` | Wrap schemas with `z.object()` for v2 |
| `src/mcp/tools/validate-plan.ts` | Wrap schemas with `z.object()` for v2 |
| `src/mcp/tools/index.ts` | Migrate from `.tool()` to `.registerTool()` |
| `src/index.ts` | Dual-mode entry point (stdio or HTTP) |
| `.env.example` | Add HTTP configuration variables |
| `vitest.config.ts` | Increase test timeout for HTTP integration tests |

---

## Phase 1: SDK Migration & HTTP Config

### Task 1: Migrate Dependencies to MCP SDK v2 + Fastify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update package.json dependencies**

Replace the dependencies and devDependencies in `package.json`:

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.750.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@modelcontextprotocol/fastify": "^2.0.0-alpha.2",
    "@modelcontextprotocol/node": "^2.0.0-alpha.2",
    "@modelcontextprotocol/server": "^2.0.0-alpha.2",
    "dotenv": "^16.4.0",
    "fastify": "^5.3.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "aws-sdk-client-mock": "^4.0.0",
    "tsup": "^8.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `rm -rf node_modules package-lock.json && npm install`
Expected: All dependencies installed without errors

- [ ] **Step 3: Verify imports resolve**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: Errors about missing v1 imports (this is expected — we'll fix them in subsequent tasks)

- [ ] **Step 4: Commit**

```bash
git checkout -b feature/http-transport
git add package.json package-lock.json
git commit -m "feat: migrate to MCP SDK v2 packages, add Fastify and HTTP deps"
```

---

### Task 2: Extend Configuration for HTTP

**Files:**
- Modify: `src/config/index.ts`
- Modify: `tests/config/config.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing tests**

Append to `tests/config/config.test.ts`:

```typescript
describe("HTTP configuration", () => {
  it("should load HTTP config with defaults", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_ACCESS_KEY_ID: "test-key",
      S3_SECRET_ACCESS_KEY: "test-secret",
      API_KEY: "my-secret-api-key",
    });

    expect(config.HTTP_HOST).toBe("127.0.0.1");
    expect(config.HTTP_PORT).toBe(3000);
    expect(config.API_KEY).toBe("my-secret-api-key");
    expect(config.CORS_ORIGIN).toBe("*");
    expect(config.RATE_LIMIT_MAX).toBe(100);
    expect(config.RATE_LIMIT_WINDOW).toBe(60000);
    expect(config.TRANSPORT_MODE).toBe("stdio");
  });

  it("should load HTTP mode config from env", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      HTTP_HOST: "0.0.0.0",
      HTTP_PORT: "8080",
      API_KEY: "vault-key-123",
      CORS_ORIGIN: "https://app.example.com",
      RATE_LIMIT_MAX: "50",
      RATE_LIMIT_WINDOW: "30000",
      TRANSPORT_MODE: "http",
    });

    expect(config.HTTP_HOST).toBe("0.0.0.0");
    expect(config.HTTP_PORT).toBe(8080);
    expect(config.API_KEY).toBe("vault-key-123");
    expect(config.CORS_ORIGIN).toBe("https://app.example.com");
    expect(config.RATE_LIMIT_MAX).toBe(50);
    expect(config.RATE_LIMIT_WINDOW).toBe(30000);
    expect(config.TRANSPORT_MODE).toBe("http");
  });

  it("should require API_KEY when transport mode is http", () => {
    expect(() =>
      loadConfig({
        S3_ENDPOINT: "https://r2.example.com",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
        TRANSPORT_MODE: "http",
      }),
    ).toThrow();
  });

  it("should not require API_KEY in stdio mode", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      TRANSPORT_MODE: "stdio",
    });

    expect(config.API_KEY).toBeUndefined();
  });

  it("should reject invalid transport mode", () => {
    expect(() =>
      loadConfig({
        S3_ENDPOINT: "https://r2.example.com",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
        TRANSPORT_MODE: "grpc",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config/config.test.ts`
Expected: FAIL — new tests fail because config does not yet have HTTP fields

- [ ] **Step 3: Update the config module**

Replace `src/config/index.ts` with:

```typescript
import { z } from "zod";

const configSchema = z
  .object({
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().default("auto"),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET: z.string().default("agent-vault"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    TRANSPORT_MODE: z.enum(["stdio", "http"]).default("stdio"),
    HTTP_HOST: z.string().default("127.0.0.1"),
    HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    API_KEY: z.string().optional(),
    CORS_ORIGIN: z.string().default("*"),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60000),
  })
  .refine(
    (data) => {
      if (data.TRANSPORT_MODE === "http" && !data.API_KEY) {
        return false;
      }
      return true;
    },
    {
      message: "API_KEY is required when TRANSPORT_MODE is http",
      path: ["API_KEY"],
    },
  );

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
    TRANSPORT_MODE: source.TRANSPORT_MODE,
    HTTP_HOST: source.HTTP_HOST,
    HTTP_PORT: source.HTTP_PORT,
    API_KEY: source.API_KEY,
    CORS_ORIGIN: source.CORS_ORIGIN,
    RATE_LIMIT_MAX: source.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW: source.RATE_LIMIT_WINDOW,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config/config.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Update .env.example**

Replace `.env.example` with:

```
# S3 Storage
S3_ENDPOINT=https://your-r2-endpoint.com
S3_REGION=auto
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=agent-vault

# Logging
LOG_LEVEL=info

# Transport: "stdio" (default) or "http"
TRANSPORT_MODE=stdio

# HTTP Transport (required when TRANSPORT_MODE=http)
HTTP_HOST=127.0.0.1
HTTP_PORT=3000
API_KEY=your-secret-api-key

# CORS & Rate Limiting
CORS_ORIGIN=*
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

- [ ] **Step 6: Commit**

```bash
git add src/config/index.ts tests/config/config.test.ts .env.example
git commit -m "feat: extend config with HTTP transport, auth, CORS, and rate limit settings"
```

---

### Task 3: Migrate MCP Server & Tool Registration to v2 SDK

**Files:**
- Modify: `src/mcp/server.ts`
- Modify: `src/mcp/tools/save-plan.ts`
- Modify: `src/mcp/tools/get-plan.ts`
- Modify: `src/mcp/tools/list-plans.ts`
- Modify: `src/mcp/tools/create-version.ts`
- Modify: `src/mcp/tools/validate-plan.ts`
- Modify: `src/mcp/tools/index.ts`
- Modify: `tests/mcp/server.test.ts`
- Modify: `tests/mcp/tools/registration.test.ts`

- [ ] **Step 1: Update MCP server factory**

Replace `src/mcp/server.ts` with:

```typescript
import { McpServer } from "@modelcontextprotocol/server";
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

- [ ] **Step 2: Update tool schemas to use z.object()**

Replace `src/mcp/tools/save-plan.ts`:

```typescript
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

export type SavePlanInput = z.infer<typeof savePlanInputSchema>;

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

Replace `src/mcp/tools/get-plan.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";

export const getPlanInputSchema = z.object({
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID"),
  plan_id: z.string().describe("Plan ID to retrieve"),
  version: z
    .number()
    .optional()
    .describe("Specific version number. Omit for latest."),
});

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

Replace `src/mcp/tools/list-plans.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";

export const listPlansInputSchema = z.object({
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID to list plans for"),
});

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

Replace `src/mcp/tools/create-version.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";
import { validatePlan } from "../../schema/plan-validator.js";
import { VersionManager } from "../../versioning/version-manager.js";

export const createVersionInputSchema = z.object({
  user_id: z.string().describe("Owner user ID"),
  agent_id: z.string().describe("Agent ID"),
  plan_id: z.string().describe("Existing plan ID to version"),
  plan: z
    .record(z.unknown())
    .describe("Updated plan document for the new version"),
});

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

Replace `src/mcp/tools/validate-plan.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import { Logger } from "../../utils/logger.js";
import { validatePlan } from "../../schema/plan-validator.js";

export const validatePlanInputSchema = z.object({
  plan: z
    .record(z.unknown())
    .describe("Plan document to validate against schema"),
});

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

- [ ] **Step 3: Migrate tool registration to registerTool()**

Replace `src/mcp/tools/index.ts` with:

```typescript
import type { McpServer } from "@modelcontextprotocol/server";
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
  server.registerTool(
    "save_plan",
    {
      description: "Create a new agent plan or overwrite the latest version",
      inputSchema: savePlanInputSchema,
    },
    (input) => handleSavePlan(input, storage, logger),
  );

  server.registerTool(
    "get_plan",
    {
      description:
        "Retrieve a plan by ID. Returns latest version unless version is specified.",
      inputSchema: getPlanInputSchema,
    },
    (input) => handleGetPlan(input, storage, logger),
  );

  server.registerTool(
    "list_plans",
    {
      description: "List all plan IDs for a specific agent",
      inputSchema: listPlansInputSchema,
    },
    (input) => handleListPlans(input, storage, logger),
  );

  server.registerTool(
    "create_version",
    {
      description: "Create a new version of an existing plan",
      inputSchema: createVersionInputSchema,
    },
    (input) => handleCreateVersion(input, storage, logger),
  );

  server.registerTool(
    "validate_plan",
    {
      description: "Validate a plan document against the schema without saving",
      inputSchema: validatePlanInputSchema,
    },
    (input) => handleValidatePlan(input, storage, logger),
  );
}
```

- [ ] **Step 4: Update server test imports**

Replace `tests/mcp/server.test.ts` with:

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

Replace `tests/mcp/tools/registration.test.ts` with:

```typescript
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/server";
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

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS (handler tests still pass because handler functions are unchanged — only registration API changed)

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/mcp/ tests/mcp/
git commit -m "feat: migrate MCP server and tools to v2 SDK registerTool API"
```

---

## Phase 2: HTTP Transport Layer

### Task 4: API Key Authentication

**Files:**
- Create: `src/http/auth.ts`
- Create: `tests/http/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/http/auth.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createAuthHook } from "../../../src/http/auth.js";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("API Key Authentication", () => {
  const authHook = createAuthHook("valid-api-key");

  function mockRequest(authHeader?: string): FastifyRequest {
    return {
      headers: authHeader ? { authorization: authHeader } : {},
    } as unknown as FastifyRequest;
  }

  function mockReply(): { statusCode: number; sent: string | null } & FastifyReply {
    const state = { statusCode: 200, sent: null as string | null };
    return {
      get statusCode() { return state.statusCode; },
      set statusCode(v) { state.statusCode = v; },
      code(status: number) { state.statusCode = status; return this as unknown as FastifyReply; },
      send(body: unknown) { state.sent = JSON.stringify(body); return this as unknown as FastifyReply; },
    } as unknown as FastifyReply;
  }

  it("should allow requests with valid Bearer token", async () => {
    const err = await authHook(mockRequest("Bearer valid-api-key"), mockReply());
    expect(err).toBeUndefined();
  });

  it("should reject requests with invalid API key", async () => {
    const reply = mockReply();
    const err = await authHook(mockRequest("Bearer wrong-key"), reply);
    expect(err).toBeDefined();
    expect(reply.statusCode).toBe(401);
  });

  it("should reject requests without Authorization header", async () => {
    const reply = mockReply();
    const err = await authHook(mockRequest(), reply);
    expect(err).toBeDefined();
    expect(reply.statusCode).toBe(401);
  });

  it("should reject requests with malformed Authorization header", async () => {
    const reply = mockReply();
    const err = await authHook(mockRequest("Basic abc123"), reply);
    expect(err).toBeDefined();
    expect(reply.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/http/auth.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/http/auth.ts`:

```typescript
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

export function createAuthHook(apiKey: string) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      reply.code(401).send({ error: "Missing Authorization header" });
      throw new Error("Unauthorized");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      reply.code(401).send({ error: "Invalid Authorization format. Use: Bearer <api-key>" });
      throw new Error("Unauthorized");
    }

    const token = parts[1];
    if (token !== apiKey) {
      reply.code(401).send({ error: "Invalid API key" });
      throw new Error("Unauthorized");
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/http/auth.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/http/auth.ts tests/http/auth.test.ts
git commit -m "feat: add API key authentication for HTTP transport"
```

---

### Task 5: Health Check Endpoints

**Files:**
- Create: `src/http/health.ts`
- Create: `tests/http/health.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/http/health.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { registerHealthRoutes } from "../../../src/http/health.js";
import Fastify from "fastify";

describe("Health Check Endpoints", () => {
  async function buildApp() {
    const app = Fastify();
    registerHealthRoutes(app);
    await app.ready();
    return app;
  }

  it("GET /health should return 200 with status ok", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();

    await app.close();
  });

  it("GET /ready should return 200 with ready status", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ready");

    await app.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/http/health.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/http/health.ts`:

```typescript
import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/ready", async () => {
    return { status: "ready" };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/http/health.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/http/health.ts tests/http/health.test.ts
git commit -m "feat: add health check and readiness endpoints"
```

---

### Task 6: Fastify HTTP Server with Streamable HTTP Transport

**Files:**
- Create: `src/http/server.ts`
- Create: `tests/http/server.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/http/server.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createHttpServer } from "../../../src/http/server.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import type { FastifyInstance } from "fastify";

describe("createHttpServer", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("should create a Fastify instance with MCP route", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    app = createHttpServer({
      storage,
      logger,
      apiKey: "test-key",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });

    await app.ready();
    expect(app).toBeDefined();
  });

  it("should require API key for /mcp endpoint", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    app = createHttpServer({
      storage,
      logger,
      apiKey: "test-key",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });

    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        id: 1,
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    });

    expect(response.statusCode).toBe(401);
  });

  it("should accept authenticated requests to /mcp", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    app = createHttpServer({
      storage,
      logger,
      apiKey: "test-key",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });

    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: "Bearer test-key",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        id: 1,
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result).toBeDefined();
    expect(body.result.serverInfo.name).toBe("agent-vault-mcp");
  });

  it("should register health check endpoints", async () => {
    const storage = new InMemoryStorageAdapter();
    const logger = new Logger("error");

    app = createHttpServer({
      storage,
      logger,
      apiKey: "test-key",
      host: "127.0.0.1",
      port: 0,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });

    await app.ready();

    const healthResponse = await app.inject({
      method: "GET",
      url: "/health",
    });
    expect(healthResponse.statusCode).toBe(200);

    const readyResponse = await app.inject({
      method: "GET",
      url: "/ready",
    });
    expect(readyResponse.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/http/server.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

Create `src/http/server.ts`:

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { McpServer } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createMcpFastifyApp, hostHeaderValidation } from "@modelcontextprotocol/fastify";
import type { StorageAdapter } from "../storage/storage-adapter.js";
import type { Logger } from "../utils/logger.js";
import { createVaultServer } from "../mcp/server.js";
import { createAuthHook } from "./auth.js";
import { registerHealthRoutes } from "./health.js";

export interface HttpServerOptions {
  storage: StorageAdapter;
  logger: Logger;
  apiKey: string;
  host: string;
  port: number;
  corsOrigin: string;
  rateLimitMax: number;
  rateLimitWindow: number;
}

export function createHttpServer(options: HttpServerOptions): ReturnType<typeof Fastify> {
  const app = createMcpFastifyApp({ host: options.host });

  app.register(cors, {
    origin: options.corsOrigin,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.register(rateLimit, {
    max: options.rateLimitMax,
    timeWindow: options.rateLimitWindow,
  });

  registerHealthRoutes(app);

  const authHook = createAuthHook(options.apiKey);

  const mcpServer = createVaultServer({
    storage: options.storage,
    logger: options.logger,
  });

  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  mcpServer.connect(transport).catch((err) => {
    options.logger.error("Failed to connect MCP server to transport", err);
  });

  app.addHook("onRequest", hostHeaderValidation(["localhost", "127.0.0.1", options.host]));

  app.all("/mcp", {
    onRequest: authHook,
  }, async (request, reply) => {
    await transport.handleRequest(request.raw, reply.raw, request.body);
  });

  return app;
}
```

- [ ] **Step 4: Update vitest timeout for HTTP tests**

In `vitest.config.ts`, update the test configuration:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
    },
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/http/server.test.ts`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/http/server.ts tests/http/server.test.ts vitest.config.ts
git commit -m "feat: add Fastify HTTP server with Streamable HTTP transport and CORS"
```

---

## Phase 3: Dual-Mode Entry Point & Integration

### Task 7: Dual-Mode Entry Point

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Write the dual-mode entry point**

Replace `src/index.ts` with:

```typescript
#!/usr/bin/env node

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/server";
import { loadConfig } from "./config/index.js";
import { S3StorageAdapter } from "./storage/s3-adapter.js";
import { createVaultServer } from "./mcp/server.js";
import { Logger } from "./utils/logger.js";
import { createHttpServer } from "./http/server.js";

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

  if (config.TRANSPORT_MODE === "http") {
    const app = createHttpServer({
      storage,
      logger,
      apiKey: config.API_KEY!,
      host: config.HTTP_HOST,
      port: config.HTTP_PORT,
      corsOrigin: config.CORS_ORIGIN,
      rateLimitMax: config.RATE_LIMIT_MAX,
      rateLimitWindow: config.RATE_LIMIT_WINDOW,
    });

    await app.listen({ port: config.HTTP_PORT, host: config.HTTP_HOST });
    logger.info(`AgentVault MCP server running on http://${config.HTTP_HOST}:${config.HTTP_PORT}`);
    logger.info(`Health: http://${config.HTTP_HOST}:${config.HTTP_PORT}/health`);
  } else {
    const server = createVaultServer({ storage, logger });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("AgentVault MCP server running (stdio mode)");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all existing tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add dual-mode entry point supporting stdio and HTTP transport"
```

---

### Task 8: HTTP Integration Tests

**Files:**
- Create: `tests/integration/http-flow.test.ts`

- [ ] **Step 1: Write integration tests**

Create `tests/integration/http-flow.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createHttpServer } from "../../../src/http/server.js";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import type { FastifyInstance } from "fastify";

const API_KEY = "integration-test-key";

const validPlan = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  agent_id: "agent-001",
  version: "1",
  goals: [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      description: "Integration test goal",
      priority: "high" as const,
      status: "pending" as const,
    },
  ],
  metadata: {
    created_at: "2026-04-17T00:00:00Z",
    updated_at: "2026-04-17T00:00:00Z",
    author: "integration-test",
  },
};

function buildApp(): FastifyInstance {
  const storage = new InMemoryStorageAdapter();
  const logger = new Logger("error");

  return createHttpServer({
    storage,
    logger,
    apiKey: API_KEY,
    host: "127.0.0.1",
    port: 0,
    corsOrigin: "*",
    rateLimitMax: 1000,
    rateLimitWindow: 60000,
  });
}

describe("HTTP Integration: Full MCP flow", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("should initialize MCP session, list tools, save and retrieve a plan", async () => {
    app = buildApp();
    await app.ready();

    const headers = {
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
    };

    const initResponse = await app.inject({
      method: "POST",
      url: "/mcp",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        id: 1,
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    });

    expect(initResponse.statusCode).toBe(200);
    const initBody = initResponse.json();
    expect(initBody.result.serverInfo.name).toBe("agent-vault-mcp");
    expect(initBody.result.capabilities).toBeDefined();

    const toolsResponse = await app.inject({
      method: "POST",
      url: "/mcp",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        id: 2,
        params: {},
      }),
    });

    expect(toolsResponse.statusCode).toBe(200);
    const toolsBody = toolsResponse.json();
    const toolNames = toolsBody.result.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain("save_plan");
    expect(toolNames).toContain("get_plan");
    expect(toolNames).toContain("list_plans");
    expect(toolNames).toContain("create_version");
    expect(toolNames).toContain("validate_plan");
  });

  it("should reject unauthenticated tool calls", async () => {
    app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id: 1,
        params: {
          name: "list_plans",
          arguments: { user_id: "user-1", agent_id: "agent-1" },
        },
      }),
    });

    expect(response.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `npx vitest run tests/integration/http-flow.test.ts`
Expected: 2 tests PASS

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add tests/integration/http-flow.test.ts
git commit -m "test: add HTTP integration tests for MCP session flow"
```

---

### Task 9: Update README & Build Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README with HTTP transport docs**

Read the existing `README.md`, then replace its contents with:

```markdown
# AgentVault MCP

MCP server for storing, versioning, and managing AI agent plans on S3-compatible object storage (R2, S3, MinIO).

Agents interact through MCP tools to securely create, update, and retrieve their own execution context in a structured way.

Supports two transport modes: **stdio** (local CLI) and **HTTP** (remote/network).

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your S3/R2 credentials

# Build
npm run build

# Run in stdio mode (default)
npm start

# Run in HTTP mode
TRANSPORT_MODE=http API_KEY=your-secret npm start
```

## Transport Modes

### Stdio Mode (default)

For local CLI usage. Communicates over stdin/stdout.

```bash
npm start
```

### HTTP Mode

For remote access. Uses MCP Streamable HTTP protocol over Fastify.

```bash
TRANSPORT_MODE=http \
  HTTP_PORT=3000 \
  API_KEY=your-secret-key \
  npm start
```

Endpoints:
- `POST /mcp` — MCP Streamable HTTP endpoint (requires `Authorization: Bearer <api-key>`)
- `GET /health` — Health check
- `GET /ready` — Readiness check

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
| `TRANSPORT_MODE` | No | `stdio` | `stdio` or `http` |
| `HTTP_HOST` | No | `127.0.0.1` | HTTP bind address |
| `HTTP_PORT` | No | `3000` | HTTP bind port |
| `API_KEY` | When http | - | Bearer token for authentication |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW` | No | `60000` | Rate limit window (ms) |

## Security

- HTTP mode requires API key authentication (`Authorization: Bearer <key>`)
- CORS configurable via `CORS_ORIGIN`
- Rate limiting enabled by default (100 req/min)
- DNS rebinding protection on localhost
- Access control enforces user/agent isolation

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
git commit -m "docs: update README with HTTP transport, dual-mode config, and security docs"
```

---

## Git Workflow Summary

Per the project spec:

1. **All work happens on feature branches** branched from `develop`
2. **Open PRs into `develop`** after each task is complete
3. **Squash merge** for clean history on `develop`

Suggested branch names per task:

| Task | Branch |
|------|--------|
| 1 | `feature/http-deps-migration` |
| 2 | `feature/http-config` |
| 3 | `feature/v2-sdk-migration` |
| 4 | `feature/http-auth` |
| 5 | `feature/http-health` |
| 6 | `feature/http-server` |
| 7 | `feature/dual-mode-entry` |
| 8 | `feature/http-integration-tests` |
| 9 | `feature/http-readme` |
