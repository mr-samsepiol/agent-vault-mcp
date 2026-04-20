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
