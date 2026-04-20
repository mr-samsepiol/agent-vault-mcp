# MD Plan Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace JSON plan storage with Markdown-only developer plan storage. Remove all JSON plan tools/schema/versioning and add 3 MD tools (`save_md_plan`, `get_md_plan`, `list_md_plans`) storing raw .md files organized by project context (git repo name or parent directory name).

**Architecture:** Strip the `StorageAdapter` interface down to MD-only methods (`saveMdPlan`, `getMdPlan`, `listMdPlans`). Remove 5 JSON tools, plan schema, version manager, agent definitions, access control, and plan validator. Create 3 new MCP tools that accept a `project_name` parameter — the calling AI agent provides the repo name or directory name. Storage key pattern: `vault/{userId}/{projectName}/plans/{filename}.md`. Full test coverage for both stdio and HTTP transports, covering both repo-name and directory-name scenarios.

**Tech Stack:** TypeScript, Zod, S3 (Cloudflare R2), Vitest, MCP SDK v2 (`@modelcontextprotocol/server`), Fastify

**Branch:** `feature/md-plan-storage` from `develop`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/storage/md-plan-types.ts` | Create | `MdPlanKey` type, `buildMdPlanS3Key`, `buildMdPlanListPrefix` helpers |
| `src/storage/storage-adapter.ts` | Rewrite | Remove JSON methods + types, add MD methods only |
| `src/storage/s3-adapter.ts` | Rewrite | Remove JSON methods, implement MD methods only |
| `src/mcp/tools/save-md-plan.ts` | Create | `save_md_plan` tool handler + Zod schema |
| `src/mcp/tools/get-md-plan.ts` | Create | `get_md_plan` tool handler + Zod schema |
| `src/mcp/tools/list-md-plans.ts` | Create | `list_md_plans` tool handler + Zod schema |
| `src/mcp/tools/index.ts` | Rewrite | Remove 5 JSON tool registrations, add 3 MD tools |
| `src/mcp/tools/save-plan.ts` | Delete | JSON plan tool (replaced by MD) |
| `src/mcp/tools/get-plan.ts` | Delete | JSON plan tool (replaced by MD) |
| `src/mcp/tools/list-plans.ts` | Delete | JSON plan tool (replaced by MD) |
| `src/mcp/tools/create-version.ts` | Delete | JSON plan versioning (not needed for MD) |
| `src/mcp/tools/validate-plan.ts` | Delete | JSON schema validation (not needed for MD) |
| `src/schema/plan-schema.ts` | Delete | JSON plan Zod schema (not needed for MD) |
| `src/schema/plan-validator.ts` | Delete | JSON plan validation logic |
| `src/versioning/version-manager.ts` | Delete | Version metadata management (not needed for MD) |
| `src/agents/definitions.ts` | Delete | Agent type definitions (not needed for MD) |
| `src/security/access-control.ts` | Delete | Access control (not needed for MD) |
| `src/utils/errors.ts` | Modify | Remove `PlanNotFoundError`, `PlanValidationError`, `VersionConflictError` |
| All test files under `tests/` matching deleted source files | Delete | Remove obsolete tests |
| `tests/storage/md-plan-storage.test.ts` | Create | Unit tests for InMemoryStorageAdapter MD methods |
| `tests/storage/s3-md-plan.test.ts` | Create | Unit tests for S3StorageAdapter MD methods (mocked) |
| `tests/mcp/tools/save-md-plan.test.ts` | Create | Unit tests for save_md_plan handler |
| `tests/mcp/tools/get-md-plan.test.ts` | Create | Unit tests for get_md_plan handler |
| `tests/mcp/tools/list-md-plans.test.ts` | Create | Unit tests for list_md_plans handler |
| `tests/integration/md-plan-stdio.test.ts` | Create | Stdio flow test — repo case + dirname case |
| `tests/integration/md-plan-http.test.ts` | Create | HTTP flow test — repo case + dirname case |

---

### Task 1: Create branch, define MdPlanKey type, and rewrite errors

**Files:**
- Create: `src/storage/md-plan-types.ts`
- Modify: `src/utils/errors.ts`

- [ ] **Step 1: Create feature branch from develop**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/md-plan-storage
```

- [ ] **Step 2: Create the MdPlanKey type and key builder**

```typescript
// src/storage/md-plan-types.ts

export interface MdPlanKey {
  userId: string;
  projectName: string;
  filename: string;
}

export function buildMdPlanS3Key(key: MdPlanKey): string {
  return `vault/${key.userId}/${key.projectName}/plans/${key.filename}`;
}

export function buildMdPlanListPrefix(userId: string, projectName: string): string {
  return `vault/${userId}/${projectName}/plans/`;
}
```

- [ ] **Step 3: Simplify errors.ts — keep only VaultError and StorageError**

Rewrite `src/utils/errors.ts`:

```typescript
export class VaultError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VaultError";
  }
}

export class StorageError extends VaultError {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = "StorageError";
  }
}
```

- [ ] **Step 4: Verify the files compile**

Run: `npx tsc --noEmit`
Expected: Errors in files importing removed error classes — that's OK, we fix those in later tasks

- [ ] **Step 5: Commit**

```bash
git add src/storage/md-plan-types.ts src/utils/errors.ts
git commit -m "feat: add MdPlanKey type and simplify error classes"
```

---

### Task 2: Rewrite StorageAdapter — MD-only interface and InMemory implementation

**Files:**
- Rewrite: `src/storage/storage-adapter.ts`
- Create: `tests/storage/md-plan-storage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/storage/md-plan-storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../src/storage/storage-adapter.js";
import type { MdPlanKey } from "../../src/storage/md-plan-types.js";

describe("InMemoryStorageAdapter - MD Plans", () => {
  let storage: InMemoryStorageAdapter;
  const mdKey: MdPlanKey = {
    userId: "user-1",
    projectName: "agent-vault-mcp",
    filename: "2026-04-19-auth-feature.md",
  };
  const mdContent = "# Auth Feature Plan\n\n## Overview\nImplement auth...";

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
  });

  it("should save and retrieve an MD plan", async () => {
    await storage.saveMdPlan(mdKey, mdContent);
    const result = await storage.getMdPlan(mdKey);
    expect(result).toBe(mdContent);
  });

  it("should list MD plans for a project", async () => {
    const key2: MdPlanKey = { ...mdKey, filename: "2026-04-20-api.md" };
    await storage.saveMdPlan(mdKey, mdContent);
    await storage.saveMdPlan(key2, "# API Plan\n\nContent...");
    const plans = await storage.listMdPlans("user-1", "agent-vault-mcp");
    expect(plans).toHaveLength(2);
    expect(plans).toContain("2026-04-19-auth-feature.md");
    expect(plans).toContain("2026-04-20-api.md");
  });

  it("should overwrite an existing MD plan", async () => {
    await storage.saveMdPlan(mdKey, "original");
    await storage.saveMdPlan(mdKey, "updated");
    const result = await storage.getMdPlan(mdKey);
    expect(result).toBe("updated");
  });

  it("should return null for non-existent MD plan", async () => {
    const result = await storage.getMdPlan(mdKey);
    expect(result).toBeNull();
  });

  it("should return empty array for project with no plans", async () => {
    const plans = await storage.listMdPlans("user-1", "nonexistent-project");
    expect(plans).toEqual([]);
  });

  it("should separate plans by project name", async () => {
    const otherKey: MdPlanKey = { ...mdKey, projectName: "other-project" };
    await storage.saveMdPlan(mdKey, mdContent);
    await storage.saveMdPlan(otherKey, "Other content");
    const plans1 = await storage.listMdPlans("user-1", "agent-vault-mcp");
    const plans2 = await storage.listMdPlans("user-1", "other-project");
    expect(plans1).toHaveLength(1);
    expect(plans2).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage/md-plan-storage.test.ts`
Expected: FAIL — `InMemoryStorageAdapter` does not have `saveMdPlan`

- [ ] **Step 3: Rewrite storage-adapter.ts — MD-only**

Rewrite `src/storage/storage-adapter.ts`:

```typescript
import type { MdPlanKey } from "./md-plan-types.js";
import { buildMdPlanS3Key, buildMdPlanListPrefix } from "./md-plan-types.js";

export interface StorageAdapter {
  saveMdPlan(key: MdPlanKey, content: string): Promise<void>;
  getMdPlan(key: MdPlanKey): Promise<string | null>;
  listMdPlans(userId: string, projectName: string): Promise<string[]>;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private mdPlans = new Map<string, string>();

  async saveMdPlan(key: MdPlanKey, content: string): Promise<void> {
    this.mdPlans.set(buildMdPlanS3Key(key), content);
  }

  async getMdPlan(key: MdPlanKey): Promise<string | null> {
    return this.mdPlans.get(buildMdPlanS3Key(key)) ?? null;
  }

  async listMdPlans(userId: string, projectName: string): Promise<string[]> {
    const prefix = buildMdPlanListPrefix(userId, projectName);
    const filenames: string[] = [];
    for (const k of this.mdPlans.keys()) {
      if (k.startsWith(prefix)) {
        filenames.push(k.slice(prefix.length));
      }
    }
    return filenames.sort();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/storage/md-plan-storage.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/storage-adapter.ts tests/storage/md-plan-storage.test.ts
git commit -m "feat: rewrite StorageAdapter as MD-only interface with InMemory implementation"
```

---

### Task 3: Rewrite S3StorageAdapter — MD-only

**Files:**
- Rewrite: `src/storage/s3-adapter.ts`
- Create: `tests/storage/s3-md-plan.test.ts`
- Delete: `tests/storage/storage-adapter.test.ts`, `tests/storage/s3-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/storage/s3-md-plan.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { S3StorageAdapter } from "../../src/storage/s3-adapter.js";
import type { MdPlanKey } from "../../src/storage/md-plan-types.js";

const s3Mock = mockClient(S3Client);

function createAdapter(): S3StorageAdapter {
  return new S3StorageAdapter({
    endpoint: "http://localhost:9000",
    region: "auto",
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
    bucket: "test-bucket",
  });
}

describe("S3StorageAdapter - MD Plans", () => {
  const mdKey: MdPlanKey = {
    userId: "user-1",
    projectName: "my-repo",
    filename: "plan.md",
  };

  beforeEach(() => {
    s3Mock.reset();
  });

  it("should save MD plan to S3 with text/markdown content type", async () => {
    s3Mock.on(PutObjectCommand).resolves({});
    const adapter = createAdapter();
    await adapter.saveMdPlan(mdKey, "# Plan");
    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args.input.Key).toBe("vault/user-1/my-repo/plans/plan.md");
    expect(calls[0].args.input.ContentType).toBe("text/markdown");
  });

  it("should get MD plan from S3", async () => {
    const body = "# Plan content";
    s3Mock.on(GetObjectCommand).resolves({
      Body: { transformToString: async () => body } as any,
    });
    const adapter = createAdapter();
    const result = await adapter.getMdPlan(mdKey);
    expect(result).toBe("# Plan content");
  });

  it("should return null for non-existent MD plan", async () => {
    s3Mock.on(GetObjectCommand).rejects({ name: "NoSuchKey" });
    const adapter = createAdapter();
    const result = await adapter.getMdPlan(mdKey);
    expect(result).toBeNull();
  });

  it("should list MD plans from S3", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        { Key: "vault/user-1/my-repo/plans/plan-a.md" },
        { Key: "vault/user-1/my-repo/plans/plan-b.md" },
      ],
    });
    const adapter = createAdapter();
    const plans = await adapter.listMdPlans("user-1", "my-repo");
    expect(plans).toEqual(["plan-a.md", "plan-b.md"]);
  });

  it("should return empty array when no MD plans found", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({});
    const adapter = createAdapter();
    const plans = await adapter.listMdPlans("user-1", "empty-project");
    expect(plans).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage/s3-md-plan.test.ts`
Expected: FAIL — `S3StorageAdapter` does not have `saveMdPlan`

- [ ] **Step 3: Rewrite s3-adapter.ts — MD-only**

Rewrite `src/storage/s3-adapter.ts`:

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { StorageAdapter } from "./storage-adapter.js";
import type { MdPlanKey } from "./md-plan-types.js";
import { buildMdPlanS3Key, buildMdPlanListPrefix } from "./md-plan-types.js";
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

  async saveMdPlan(key: MdPlanKey, content: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: buildMdPlanS3Key(key),
          Body: content,
          ContentType: "text/markdown",
        }),
      );
    } catch (error) {
      throw new StorageError("Failed to save MD plan", error as Error);
    }
  }

  async getMdPlan(key: MdPlanKey): Promise<string | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: buildMdPlanS3Key(key) }),
      );
      return await response.Body!.transformToString();
    } catch (error: any) {
      if (
        error.name === "NoSuchKey" ||
        error.Code === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      throw new StorageError("Failed to get MD plan", error as Error);
    }
  }

  async listMdPlans(userId: string, projectName: string): Promise<string[]> {
    try {
      const prefix = buildMdPlanListPrefix(userId, projectName);
      const response = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
      );
      if (!response.Contents) return [];
      return response.Contents
        .filter((obj) => obj.Key)
        .map((obj) => obj.Key!.slice(prefix.length))
        .sort();
    } catch (error) {
      throw new StorageError("Failed to list MD plans", error as Error);
    }
  }
}
```

- [ ] **Step 4: Delete obsolete storage test files**

```bash
rm -f tests/storage/storage-adapter.test.ts tests/storage/s3-adapter.test.ts
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/storage/`
Expected: All MD storage tests PASS (11 total — 6 InMemory + 5 S3)

- [ ] **Step 6: Commit**

```bash
git add src/storage/s3-adapter.ts tests/storage/s3-md-plan.test.ts
git rm tests/storage/storage-adapter.test.ts tests/storage/s3-adapter.test.ts
git commit -m "feat: rewrite S3StorageAdapter as MD-only, remove obsolete storage tests"
```

---

### Task 4: Delete JSON plan source files and their tests

**Files:**
- Delete: `src/mcp/tools/save-plan.ts`
- Delete: `src/mcp/tools/get-plan.ts`
- Delete: `src/mcp/tools/list-plans.ts`
- Delete: `src/mcp/tools/create-version.ts`
- Delete: `src/mcp/tools/validate-plan.ts`
- Delete: `src/schema/plan-schema.ts`
- Delete: `src/schema/plan-validator.ts`
- Delete: `src/versioning/version-manager.ts`
- Delete: `src/agents/definitions.ts`
- Delete: `src/security/access-control.ts`
- Delete: `tests/mcp/tools/save-plan.test.ts`
- Delete: `tests/mcp/tools/get-plan.test.ts`
- Delete: `tests/mcp/tools/list-plans.test.ts`
- Delete: `tests/mcp/tools/create-version.test.ts`
- Delete: `tests/mcp/tools/validate-plan.test.ts`
- Delete: `tests/schema/plan-schema.test.ts`
- Delete: `tests/schema/plan-validator.test.ts`
- Delete: `tests/versioning/version-manager.test.ts`
- Delete: `tests/agents/definitions.test.ts`
- Delete: `tests/security/access-control.test.ts`
- Delete: `tests/integration/full-flow.test.ts`

- [ ] **Step 1: Delete all JSON plan source files**

```bash
git rm src/mcp/tools/save-plan.ts src/mcp/tools/get-plan.ts src/mcp/tools/list-plans.ts src/mcp/tools/create-version.ts src/mcp/tools/validate-plan.ts
git rm src/schema/plan-schema.ts src/schema/plan-validator.ts
git rm src/versioning/version-manager.ts
git rm src/agents/definitions.ts
git rm src/security/access-control.ts
```

- [ ] **Step 2: Delete all JSON plan test files**

```bash
git rm tests/mcp/tools/save-plan.test.ts tests/mcp/tools/get-plan.test.ts tests/mcp/tools/list-plans.test.ts tests/mcp/tools/create-version.test.ts tests/mcp/tools/validate-plan.test.ts
git rm tests/schema/plan-schema.test.ts tests/schema/plan-validator.test.ts
git rm tests/versioning/version-manager.test.ts
git rm tests/agents/definitions.test.ts
git rm tests/security/access-control.test.ts
git rm tests/integration/full-flow.test.ts
```

- [ ] **Step 3: Remove empty directories**

```bash
rmdir src/schema src/versioning src/agents src/security tests/schema tests/versioning tests/agents tests/security 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: remove JSON plan tools, schema, versioning, agents, and access control"
```

---

### Task 5: Rewrite tools/index.ts — MD tools only

**Files:**
- Rewrite: `src/mcp/tools/index.ts`

- [ ] **Step 1: Write the new tool registration index**

Rewrite `src/mcp/tools/index.ts`:

```typescript
import type { McpServer } from "@modelcontextprotocol/server";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";
import { wrapZodSchema } from "../zod-schema.js";
import { handleSaveMdPlan, saveMdPlanInputSchema } from "./save-md-plan.js";
import { handleGetMdPlan, getMdPlanInputSchema } from "./get-md-plan.js";
import { handleListMdPlans, listMdPlansInputSchema } from "./list-md-plans.js";

export function registerAllTools(server: McpServer, storage: StorageAdapter, logger: Logger): void {
  server.registerTool(
    "save_md_plan",
    {
      description:
        "Save a Markdown developer plan. project_name should be the git repo name if in a repository, or the parent directory name otherwise.",
      inputSchema: wrapZodSchema(saveMdPlanInputSchema),
    },
    (input) => handleSaveMdPlan(input, storage, logger),
  );
  server.registerTool(
    "get_md_plan",
    {
      description: "Retrieve a Markdown developer plan by filename and project name.",
      inputSchema: wrapZodSchema(getMdPlanInputSchema),
    },
    (input) => handleGetMdPlan(input, storage, logger),
  );
  server.registerTool(
    "list_md_plans",
    {
      description: "List all Markdown developer plans for a project.",
      inputSchema: wrapZodSchema(listMdPlansInputSchema),
    },
    (input) => handleListMdPlans(input, storage, logger),
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mcp/tools/index.ts
git commit -m "refactor: rewrite tool registration index for MD-only tools"
```

---

### Task 6: Create save_md_plan MCP tool

**Files:**
- Create: `src/mcp/tools/save-md-plan.ts`
- Create: `tests/mcp/tools/save-md-plan.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/mcp/tools/save-md-plan.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { handleSaveMdPlan } from "../../../src/mcp/tools/save-md-plan.js";

describe("handleSaveMdPlan", () => {
  let storage: InMemoryStorageAdapter;
  let logger: Logger;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    logger = new Logger("silent");
  });

  it("should save MD plan and return success", async () => {
    const result = await handleSaveMdPlan(
      {
        user_id: "user-1",
        project_name: "agent-vault-mcp",
        filename: "2026-04-19-feature.md",
        content: "# Feature Plan\n\n## Overview\nDetails here...",
      },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.filename).toBe("2026-04-19-feature.md");
    expect(parsed.project_name).toBe("agent-vault-mcp");
  });

  it("should reject empty content", async () => {
    const result = await handleSaveMdPlan(
      { user_id: "user-1", project_name: "agent-vault-mcp", filename: "empty.md", content: "" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("content");
  });

  it("should reject missing filename", async () => {
    const result = await handleSaveMdPlan(
      { user_id: "user-1", project_name: "agent-vault-mcp", filename: "", content: "# Plan" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("filename");
  });

  it("should reject missing project_name", async () => {
    const result = await handleSaveMdPlan(
      { user_id: "user-1", project_name: "", filename: "plan.md", content: "# Plan" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("project_name");
  });

  it("should persist actual content to storage", async () => {
    const content = "# Real Plan\n\n## Steps\n1. Do thing\n2. Done";
    await handleSaveMdPlan(
      { user_id: "user-1", project_name: "my-repo", filename: "real-plan.md", content },
      storage,
      logger,
    );
    const saved = await storage.getMdPlan({
      userId: "user-1",
      projectName: "my-repo",
      filename: "real-plan.md",
    });
    expect(saved).toBe(content);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/save-md-plan.test.ts`
Expected: FAIL — module `save-md-plan` not found

- [ ] **Step 3: Implement save_md_plan handler**

Create `src/mcp/tools/save-md-plan.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp/tools/save-md-plan.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/mcp/tools/save-md-plan.ts tests/mcp/tools/save-md-plan.test.ts
git commit -m "feat: add save_md_plan MCP tool for Markdown plan storage"
```

---

### Task 7: Create get_md_plan MCP tool

**Files:**
- Create: `src/mcp/tools/get-md-plan.ts`
- Create: `tests/mcp/tools/get-md-plan.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/mcp/tools/get-md-plan.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { handleGetMdPlan } from "../../../src/mcp/tools/get-md-plan.js";

describe("handleGetMdPlan", () => {
  let storage: InMemoryStorageAdapter;
  let logger: Logger;

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter();
    logger = new Logger("silent");
    await storage.saveMdPlan(
      { userId: "user-1", projectName: "my-repo", filename: "plan.md" },
      "# Plan\n\n## Content\nDetails...",
    );
  });

  it("should retrieve an existing MD plan", async () => {
    const result = await handleGetMdPlan(
      { user_id: "user-1", project_name: "my-repo", filename: "plan.md" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.content).toBe("# Plan\n\n## Content\nDetails...");
  });

  it("should return error for non-existent plan", async () => {
    const result = await handleGetMdPlan(
      { user_id: "user-1", project_name: "my-repo", filename: "nope.md" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("not found");
  });

  it("should reject missing project_name", async () => {
    const result = await handleGetMdPlan(
      { user_id: "user-1", project_name: "", filename: "plan.md" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("project_name");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/get-md-plan.test.ts`
Expected: FAIL — module `get-md-plan` not found

- [ ] **Step 3: Implement get_md_plan handler**

Create `src/mcp/tools/get-md-plan.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { MdPlanKey } from "../../storage/md-plan-types.js";
import type { Logger } from "../../utils/logger.js";

export const getMdPlanInputSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  project_name: z.string().min(1, "project_name is required"),
  filename: z.string().min(1, "filename is required"),
});

export type GetMdPlanInput = z.infer<typeof getMdPlanInputSchema>;

export async function handleGetMdPlan(input: unknown, storage: StorageAdapter, logger: Logger) {
  const parsed = getMdPlanInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: errors }) }],
    };
  }

  const { user_id, project_name, filename } = parsed.data;
  const key: MdPlanKey = { userId: user_id, projectName: project_name, filename };

  try {
    const content = await storage.getMdPlan(key);
    if (content === null) {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ success: false, error: `MD plan "${filename}" not found` }) },
        ],
      };
    }
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true, content, filename, project_name }) },
      ],
    };
  } catch (error: any) {
    logger.error("Failed to get MD plan", { error: error.message });
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: false, error: "Failed to get MD plan" }) },
      ],
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp/tools/get-md-plan.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/mcp/tools/get-md-plan.ts tests/mcp/tools/get-md-plan.test.ts
git commit -m "feat: add get_md_plan MCP tool for Markdown plan retrieval"
```

---

### Task 8: Create list_md_plans MCP tool

**Files:**
- Create: `src/mcp/tools/list-md-plans.ts`
- Create: `tests/mcp/tools/list-md-plans.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/mcp/tools/list-md-plans.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageAdapter } from "../../../src/storage/storage-adapter.js";
import { Logger } from "../../../src/utils/logger.js";
import { handleListMdPlans } from "../../../src/mcp/tools/list-md-plans.js";

describe("handleListMdPlans", () => {
  let storage: InMemoryStorageAdapter;
  let logger: Logger;

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter();
    logger = new Logger("silent");
    await storage.saveMdPlan({ userId: "user-1", projectName: "my-repo", filename: "plan-a.md" }, "# A");
    await storage.saveMdPlan({ userId: "user-1", projectName: "my-repo", filename: "plan-b.md" }, "# B");
    await storage.saveMdPlan({ userId: "user-1", projectName: "other-project", filename: "plan-c.md" }, "# C");
  });

  it("should list plans for a specific project", async () => {
    const result = await handleListMdPlans(
      { user_id: "user-1", project_name: "my-repo" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.plans).toEqual(["plan-a.md", "plan-b.md"]);
  });

  it("should return empty array for project with no plans", async () => {
    const result = await handleListMdPlans(
      { user_id: "user-1", project_name: "empty" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.plans).toEqual([]);
  });

  it("should not leak plans from other projects", async () => {
    const result = await handleListMdPlans(
      { user_id: "user-1", project_name: "other-project" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.plans).toEqual(["plan-c.md"]);
  });

  it("should reject missing project_name", async () => {
    const result = await handleListMdPlans(
      { user_id: "user-1", project_name: "" },
      storage,
      logger,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("project_name");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp/tools/list-md-plans.test.ts`
Expected: FAIL — module `list-md-plans` not found

- [ ] **Step 3: Implement list_md_plans handler**

Create `src/mcp/tools/list-md-plans.ts`:

```typescript
import { z } from "zod";
import type { StorageAdapter } from "../../storage/storage-adapter.js";
import type { Logger } from "../../utils/logger.js";

export const listMdPlansInputSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  project_name: z.string().min(1, "project_name is required"),
});

export type ListMdPlansInput = z.infer<typeof listMdPlansInputSchema>;

export async function handleListMdPlans(input: unknown, storage: StorageAdapter, logger: Logger) {
  const parsed = listMdPlansInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: errors }) }],
    };
  }

  const { user_id, project_name } = parsed.data;

  try {
    const plans = await storage.listMdPlans(user_id, project_name);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true, plans, project_name }) },
      ],
    };
  } catch (error: any) {
    logger.error("Failed to list MD plans", { error: error.message });
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: false, error: "Failed to list MD plans" }) },
      ],
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp/tools/list-md-plans.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/mcp/tools/list-md-plans.ts tests/mcp/tools/list-md-plans.test.ts
git commit -m "feat: add list_md_plans MCP tool for Markdown plan listing"
```

---

### Task 9: Integration test — stdio transport simulation (repo + dirname cases)

**Files:**
- Create: `tests/integration/md-plan-stdio.test.ts`

- [ ] **Step 1: Write the integration test**

Create `tests/integration/md-plan-stdio.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { InMemoryStorageAdapter } from "../../src/storage/storage-adapter.js";

describe("MD Plan Storage — Stdio Transport Simulation", () => {
  let storage: InMemoryStorageAdapter;

  beforeAll(() => {
    storage = new InMemoryStorageAdapter();
  });

  describe("Case: Git repository (project_name = repo name)", () => {
    const repoName = "agent-vault-mcp";
    const userId = "user-1";
    const planContent = "# Auth Feature\n\n## Overview\nImplement JWT auth...\n\n## Steps\n1. Add middleware\n2. Add tests";

    it("should save an MD plan under repo name", async () => {
      await storage.saveMdPlan(
        { userId, projectName: repoName, filename: "2026-04-19-auth.md" },
        planContent,
      );
      const saved = await storage.getMdPlan({ userId, projectName: repoName, filename: "2026-04-19-auth.md" });
      expect(saved).toBe(planContent);
    });

    it("should list plans under repo name", async () => {
      const plans = await storage.listMdPlans(userId, repoName);
      expect(plans).toContain("2026-04-19-auth.md");
    });

    it("should retrieve plan content", async () => {
      const content = await storage.getMdPlan({ userId, projectName: repoName, filename: "2026-04-19-auth.md" });
      expect(content).toContain("# Auth Feature");
      expect(content).toContain("Implement JWT auth");
    });
  });

  describe("Case: No git repo (project_name = parent directory name)", () => {
    const dirName = "Documents";
    const userId = "user-2";
    const planContent = "# Personal Project\n\n## Goals\n- Learn Rust\n- Build CLI tool";

    it("should save an MD plan under directory name", async () => {
      await storage.saveMdPlan(
        { userId, projectName: dirName, filename: "2026-04-20-learning.md" },
        planContent,
      );
      const saved = await storage.getMdPlan({ userId, projectName: dirName, filename: "2026-04-20-learning.md" });
      expect(saved).toBe(planContent);
    });

    it("should list plans under directory name", async () => {
      const plans = await storage.listMdPlans(userId, dirName);
      expect(plans).toContain("2026-04-20-learning.md");
    });

    it("should not mix plans from different project contexts", async () => {
      const repoPlans = await storage.listMdPlans("user-1", "agent-vault-mcp");
      const dirPlans = await storage.listMdPlans("user-2", "Documents");
      expect(repoPlans).not.toContain("2026-04-20-learning.md");
      expect(dirPlans).not.toContain("2026-04-19-auth.md");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/integration/md-plan-stdio.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/md-plan-stdio.test.ts
git commit -m "test: add stdio integration tests for MD plan storage (repo + dirname cases)"
```

---

### Task 10: Integration test — HTTP transport simulation (repo + dirname cases)

**Files:**
- Create: `tests/integration/md-plan-http.test.ts`
- Delete: `tests/integration/http-flow.test.ts`

- [ ] **Step 1: Write the integration test**

Create `tests/integration/md-plan-http.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHttpServer } from "../../src/http/server.js";
import { InMemoryStorageAdapter } from "../../src/storage/storage-adapter.js";
import { Logger } from "../../src/utils/logger.js";
import type { FastifyInstance } from "fastify";

describe("MD Plan Storage — HTTP Transport Simulation", () => {
  let app: FastifyInstance;
  let storage: InMemoryStorageAdapter;
  const apiKey = "test-api-key";
  const baseUrl = "http://127.0.0.1:3099";

  beforeAll(async () => {
    storage = new InMemoryStorageAdapter();
    const logger = new Logger("silent");
    app = createHttpServer({
      storage,
      logger,
      apiKey,
      host: "127.0.0.1",
      port: 3099,
      corsOrigin: "*",
      rateLimitMax: 100,
      rateLimitWindow: 60000,
    });
    await app.listen({ port: 3099, host: "127.0.0.1" });
  });

  afterAll(async () => {
    await app.close();
  });

  async function initSession(): Promise<string> {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    });
    const sessionId = res.headers.get("mcp-session-id");
    expect(sessionId).toBeTruthy();
    return sessionId!;
  }

  async function callTool(sessionId: string, toolName: string, args: Record<string, string>) {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Mcp-Session-Id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
    });
    return await res.text();
  }

  describe("Case: Git repository (project_name = repo name)", () => {
    it("should save and retrieve MD plan via HTTP", async () => {
      const sessionId = await initSession();
      const saveResponse = await callTool(sessionId, "save_md_plan", {
        user_id: "user-http-1",
        project_name: "my-awesome-repo",
        filename: "2026-04-19-http-plan.md",
        content: "# HTTP Plan\n\n## Repo Case\nThis was saved via HTTP transport.",
      });
      expect(saveResponse).toContain('"success":true');
      expect(saveResponse).toContain("my-awesome-repo");

      const getResponse = await callTool(sessionId, "get_md_plan", {
        user_id: "user-http-1",
        project_name: "my-awesome-repo",
        filename: "2026-04-19-http-plan.md",
      });
      expect(getResponse).toContain("# HTTP Plan");
      expect(getResponse).toContain("Repo Case");
    });

    it("should list MD plans via HTTP for repo", async () => {
      const sessionId = await initSession();
      const listResponse = await callTool(sessionId, "list_md_plans", {
        user_id: "user-http-1",
        project_name: "my-awesome-repo",
      });
      expect(listResponse).toContain('"success":true');
      expect(listResponse).toContain("2026-04-19-http-plan.md");
    });
  });

  describe("Case: No git repo (project_name = directory name)", () => {
    it("should save and retrieve MD plan using directory name", async () => {
      const sessionId = await initSession();
      const saveResponse = await callTool(sessionId, "save_md_plan", {
        user_id: "user-http-2",
        project_name: "my-projects-folder",
        filename: "2026-04-20-dirname-plan.md",
        content: "# Directory Plan\n\n## Dirname Case\nSaved without git repo context.",
      });
      expect(saveResponse).toContain('"success":true');

      const getResponse = await callTool(sessionId, "get_md_plan", {
        user_id: "user-http-2",
        project_name: "my-projects-folder",
        filename: "2026-04-20-dirname-plan.md",
      });
      expect(getResponse).toContain("# Directory Plan");
      expect(getResponse).toContain("Dirname Case");
    });

    it("should isolate plans between different project names", async () => {
      const sessionId = await initSession();
      const listRepo = await callTool(sessionId, "list_md_plans", {
        user_id: "user-http-1",
        project_name: "my-awesome-repo",
      });
      const listDir = await callTool(sessionId, "list_md_plans", {
        user_id: "user-http-2",
        project_name: "my-projects-folder",
      });
      expect(listRepo).not.toContain("dirname-plan");
      expect(listDir).not.toContain("http-plan");
    });
  });

  it("should reject unauthenticated requests", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Delete the old JSON-based HTTP flow test**

```bash
git rm tests/integration/http-flow.test.ts
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run tests/integration/md-plan-http.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add tests/integration/md-plan-http.test.ts
git commit -m "test: add HTTP integration tests for MD plan storage (repo + dirname cases)"
```

---

### Task 11: Update entry point, build, run full test suite, and create PR

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update index.ts imports if needed**

Check `src/index.ts` for references to removed modules (e.g., agents, schema, versioning). The file should only import:
- `dotenv/config`
- `StdioServerTransport` from MCP SDK
- `loadConfig` from config
- `S3StorageAdapter` from storage
- `createVaultServer` from mcp/server
- `Logger` from utils/logger
- `createHttpServer` from http/server (when HTTP mode)

If it imports anything from deleted modules, remove those imports.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass — only MD plan tests remain (~34 tests)

- [ ] **Step 3: Build the project**

Run: `npm run build`
Expected: Successful build with no errors

- [ ] **Step 4: Push branch to remote**

```bash
git push -u origin feature/md-plan-storage
```

- [ ] **Step 5: Create PR into develop**

```bash
gh pr create --base develop --title "feat: replace JSON plans with MD-only developer plan storage" --body "$(cat <<'EOF'
## Summary
- Remove all JSON plan tools (save_plan, get_plan, list_plans, create_version, validate_plan)
- Remove plan schema, version manager, agent definitions, access control, plan validator
- Add 3 new MCP tools: `save_md_plan`, `get_md_plan`, `list_md_plans`
- Store raw Markdown developer plans organized by project context (repo name or directory name)
- Storage path: `vault/{userId}/{projectName}/plans/{filename}.md`
- Rewrite StorageAdapter interface as MD-only
- Full test coverage: unit tests, stdio integration, HTTP integration

## Breaking Changes
All 5 JSON plan tools are removed. The MCP server now exposes only MD plan tools.

## New Tools
| Tool | Description |
|------|-------------|
| `save_md_plan` | Save a Markdown plan (params: user_id, project_name, filename, content) |
| `get_md_plan` | Retrieve a Markdown plan (params: user_id, project_name, filename) |
| `list_md_plans` | List plans for a project (params: user_id, project_name) |

## Test plan
- [ ] InMemoryStorageAdapter MD methods (6 tests)
- [ ] S3StorageAdapter MD methods with mocked S3 (5 tests)
- [ ] save_md_plan handler (5 tests)
- [ ] get_md_plan handler (3 tests)
- [ ] list_md_plans handler (4 tests)
- [ ] Stdio integration: repo + dirname cases (6 tests)
- [ ] HTTP integration: repo + dirname cases (5 tests)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Verify PR is created and note the URL**
