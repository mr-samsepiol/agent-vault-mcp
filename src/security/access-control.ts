export interface AccessContext {
  userId: string;
  agentId?: string;
}

export class AccessControl {
  async canAccessPlan(context: AccessContext, planUserId: string): Promise<boolean> {
    return context.userId === planUserId;
  }

  async canModifyPlan(context: AccessContext, planUserId: string, planAgentId: string): Promise<boolean> {
    if (context.userId !== planUserId) return false;
    if (context.agentId && context.agentId !== planAgentId) return false;
    return true;
  }
}
