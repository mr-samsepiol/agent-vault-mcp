export class WorkspaceManager {
  private active = new Map<string, string>();

  set(userId: string, projectName: string): void {
    this.active.set(userId, projectName);
  }

  get(userId: string): string | null {
    return this.active.get(userId) ?? null;
  }
}
