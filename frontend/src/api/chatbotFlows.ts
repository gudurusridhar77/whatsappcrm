import apiClient from './client';

export interface ChatbotFlowRequest {
  name: string;
  description?: string;
  inboxId?: number;
  triggerType: string;
  triggerKeywords?: string;
  flowData?: FlowData;
  active?: boolean;
  priority?: number;
}

export interface ChatbotFlowResponse {
  id: number;
  name: string;
  description: string | null;
  inboxId: number | null;
  inboxName: string | null;
  triggerType: string;
  triggerKeywords: string | null;
  flowData: FlowData | null;
  active: boolean;
  priority: number;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  animated?: boolean;
  label?: string;
}

export const chatbotFlowsApi = {
  getFlows: (accountId: number) =>
    apiClient.get<ChatbotFlowResponse[]>(`/api/v1/accounts/${accountId}/chatbot_flows`),

  getFlow: (accountId: number, flowId: number) =>
    apiClient.get<ChatbotFlowResponse>(`/api/v1/accounts/${accountId}/chatbot_flows/${flowId}`),

  createFlow: (accountId: number, data: ChatbotFlowRequest) =>
    apiClient.post<ChatbotFlowResponse>(`/api/v1/accounts/${accountId}/chatbot_flows`, data),

  updateFlow: (accountId: number, flowId: number, data: Partial<ChatbotFlowRequest>) =>
    apiClient.patch<ChatbotFlowResponse>(`/api/v1/accounts/${accountId}/chatbot_flows/${flowId}`, data),

  deleteFlow: (accountId: number, flowId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/chatbot_flows/${flowId}`),

  toggleFlow: (accountId: number, flowId: number) =>
    apiClient.post<ChatbotFlowResponse>(`/api/v1/accounts/${accountId}/chatbot_flows/${flowId}/toggle`),

  duplicateFlow: (accountId: number, flowId: number) =>
    apiClient.post<ChatbotFlowResponse>(`/api/v1/accounts/${accountId}/chatbot_flows/${flowId}/duplicate`),
};
