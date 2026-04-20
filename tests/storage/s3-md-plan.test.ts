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
    expect(calls[0].args[0].input.Key).toBe("vault/user-1/my-repo/plans/plan.md");
    expect(calls[0].args[0].input.ContentType).toBe("text/markdown");
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
