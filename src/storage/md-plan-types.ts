export interface MdPlanKey {
  projectName: string;
  filename: string;
}

export function buildMdPlanS3Key(key: MdPlanKey): string {
  return `vault/${key.projectName}/plans/${key.filename}`;
}

export function buildMdPlanListPrefix(projectName: string): string {
  return `vault/${projectName}/plans/`;
}
