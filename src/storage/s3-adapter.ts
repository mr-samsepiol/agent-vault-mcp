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
