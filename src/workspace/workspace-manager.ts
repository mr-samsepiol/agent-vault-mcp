export class WorkspaceManager {
  private active: string | null = null;

  set(projectName: string): void {
    this.active = projectName;
  }

  get(): string | null {
    return this.active;
  }
}
