import apiClient from './client';

export interface CannedResponse {
  id: number;
  shortCode: string;
  content: string;
  createdAt: string;
}

export const cannedResponsesApi = {
  getAll: (accountId: number) =>
    apiClient.get<CannedResponse[]>(`/api/v1/accounts/${accountId}/canned_responses`),

  search: (accountId: number, query: string) =>
    apiClient.get<CannedResponse[]>(`/api/v1/accounts/${accountId}/canned_responses`, { params: { search: query } }),

  getById: (accountId: number, id: number) =>
    apiClient.get<CannedResponse>(`/api/v1/accounts/${accountId}/canned_responses/${id}`),

  create: (accountId: number, data: { shortCode: string; content: string }) =>
    apiClient.post<CannedResponse>(`/api/v1/accounts/${accountId}/canned_responses`, data),

  update: (accountId: number, id: number, data: { shortCode?: string; content?: string }) =>
    apiClient.patch<CannedResponse>(`/api/v1/accounts/${accountId}/canned_responses/${id}`, data),

  delete: (accountId: number, id: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/canned_responses/${id}`),
};
