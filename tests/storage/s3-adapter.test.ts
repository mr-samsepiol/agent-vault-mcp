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
