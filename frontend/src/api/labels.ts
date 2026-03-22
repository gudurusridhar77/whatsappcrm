import apiClient from './client';

export interface LabelResponse {
  id: number;
  title: string;
  description: string | null;
  color: string;
  showOnSidebar: boolean;
  conversationCount: number | null;
  createdAt: string;
}

export const labelsApi = {
  getLabels: (accountId: number) =>
    apiClient.get<LabelResponse[]>(`/api/v1/accounts/${accountId}/labels`),

  getLabel: (accountId: number, labelId: number) =>
    apiClient.get<LabelResponse>(`/api/v1/accounts/${accountId}/labels/${labelId}`),

  createLabel: (accountId: number, data: { title: string; description?: string; color?: string; showOnSidebar?: boolean }) =>
    apiClient.post<LabelResponse>(`/api/v1/accounts/${accountId}/labels`, data),

  updateLabel: (accountId: number, labelId: number, data: { title?: string; description?: string; color?: string; showOnSidebar?: boolean }) =>
    apiClient.patch<LabelResponse>(`/api/v1/accounts/${accountId}/labels/${labelId}`, data),

  deleteLabel: (accountId: number, labelId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/labels/${labelId}`),

  getConversationLabels: (accountId: number, conversationId: number) =>
    apiClient.get<LabelResponse[]>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`),

  setConversationLabels: (accountId: number, conversationId: number, labelIds: number[]) =>
    apiClient.post<LabelResponse[]>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, { labelIds }),
};
