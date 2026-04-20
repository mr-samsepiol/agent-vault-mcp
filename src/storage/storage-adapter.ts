import type { MdPlanKey } from "./md-plan-types.js";
import { buildMdPlanS3Key, buildMdPlanListPrefix } from "./md-plan-types.js";

export interface StorageAdapter {
  saveMdPlan(key: MdPlanKey, content: string): Promise<void>;
  getMdPlan(key: MdPlanKey): Promise<string | null>;
  listMdPlans(userId: string, projectName: string): Promise<string[]>;
  listWorkspaces(userId: string): Promise<string[]>;
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

  async listWorkspaces(userId: string): Promise<string[]> {
    const prefix = `vault/${userId}/`;
    const workspaces = new Set<string>();
    for (const k of this.mdPlans.keys()) {
      if (k.startsWith(prefix)) {
        const rest = k.slice(prefix.length);
        const segments = rest.split("/");
        if (segments.length >= 2) {
          workspaces.add(segments[0]);
        }
      }
    }
    return [...workspaces].sort();
  }
}
