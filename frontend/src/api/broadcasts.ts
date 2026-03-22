import apiClient from './client';

export interface BroadcastRequest {
  name: string;
  description?: string;
  inboxId: number;
  templateId: number;
  contactIds?: number[];
  defaultBodyParams?: string[];
  scheduledAt?: string;
}

export interface BroadcastResponse {
  id: number;
  name: string;
  description: string | null;
  inboxId: number;
  inboxName: string;
  templateId: number;
  templateName: string;
  status: string;
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  repliedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export const broadcastsApi = {
  getBroadcasts: (accountId: number) =>
    apiClient.get<BroadcastResponse[]>(`/api/v1/accounts/${accountId}/broadcasts`),

  getBroadcast: (accountId: number, broadcastId: number) =>
    apiClient.get<BroadcastResponse>(`/api/v1/accounts/${accountId}/broadcasts/${broadcastId}`),

  createBroadcast: (accountId: number, data: BroadcastRequest) =>
    apiClient.post<BroadcastResponse>(`/api/v1/accounts/${accountId}/broadcasts`, data),

  startBroadcast: (accountId: number, broadcastId: number) =>
    apiClient.post<BroadcastResponse>(`/api/v1/accounts/${accountId}/broadcasts/${broadcastId}/start`),

  cancelBroadcast: (accountId: number, broadcastId: number) =>
    apiClient.post(`/api/v1/accounts/${accountId}/broadcasts/${broadcastId}/cancel`),

  deleteBroadcast: (accountId: number, broadcastId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/broadcasts/${broadcastId}`),
};
