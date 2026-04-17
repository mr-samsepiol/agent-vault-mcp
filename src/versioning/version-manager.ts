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
