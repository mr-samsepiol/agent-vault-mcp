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
