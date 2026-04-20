// src/storage/md-plan-types.ts

export interface MdPlanKey {
  userId: string;
  projectName: string;
  filename: string;
}

export function buildMdPlanS3Key(key: MdPlanKey): string {
  return `vault/${key.userId}/${key.projectName}/plans/${key.filename}`;
}

export function buildMdPlanListPrefix(userId: string, projectName: string): string {
  return `vault/${userId}/${projectName}/plans/`;
}