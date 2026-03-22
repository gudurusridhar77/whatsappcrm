import apiClient from './client';

export interface RuleCondition {
  attribute: string;
  operator: string;
  value: string;
}

export interface RuleAction {
  type: string;
  value: string;
}

export interface AutomationRuleResponse {
  id: number;
  name: string;
  description: string | null;
  eventName: string;
  active: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRuleRequest {
  name: string;
  description?: string;
  eventName: string;
  active?: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export const automationsApi = {
  getRules: (accountId: number) =>
    apiClient.get<AutomationRuleResponse[]>(`/api/v1/accounts/${accountId}/automation_rules`),

  getRule: (accountId: number, ruleId: number) =>
    apiClient.get<AutomationRuleResponse>(`/api/v1/accounts/${accountId}/automation_rules/${ruleId}`),

  createRule: (accountId: number, data: AutomationRuleRequest) =>
    apiClient.post<AutomationRuleResponse>(`/api/v1/accounts/${accountId}/automation_rules`, data),

  updateRule: (accountId: number, ruleId: number, data: Partial<AutomationRuleRequest>) =>
    apiClient.patch<AutomationRuleResponse>(`/api/v1/accounts/${accountId}/automation_rules/${ruleId}`, data),

  deleteRule: (accountId: number, ruleId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/automation_rules/${ruleId}`),

  toggleRule: (accountId: number, ruleId: number) =>
    apiClient.post<AutomationRuleResponse>(`/api/v1/accounts/${accountId}/automation_rules/${ruleId}/toggle`),
};
