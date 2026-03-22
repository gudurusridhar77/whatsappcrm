import apiClient from './client';

export interface ScheduledMessageRequest {
  scheduleType: 'DIRECT' | 'TEMPLATE' | 'BROADCAST';
  inboxId: number;
  contactId?: number;
  content?: string;
  templateId?: number;
  bodyParams?: string[];
  broadcastId?: number;
  scheduledAt: string;
  label?: string;
}

export interface ScheduledMessageResponse {
  id: number;
  scheduleType: string;
  inboxId: number;
  inboxName: string;
  contactId: number | null;
  contactName: string | null;
  contactPhone: string | null;
  content: string | null;
  templateId: number | null;
  templateName: string | null;
  bodyParams: string[] | null;
  broadcastId: number | null;
  broadcastName: string | null;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  failureReason: string | null;
  label: string | null;
  createdBy: number;
  createdAt: string;
}

export const scheduledMessagesApi = {
  getAll: (accountId: number) =>
    apiClient.get<ScheduledMessageResponse[]>(`/api/v1/accounts/${accountId}/scheduled-messages`),

  getOne: (accountId: number, id: number) =>
    apiClient.get<ScheduledMessageResponse>(`/api/v1/accounts/${accountId}/scheduled-messages/${id}`),

  create: (accountId: number, data: ScheduledMessageRequest) =>
    apiClient.post<ScheduledMessageResponse>(`/api/v1/accounts/${accountId}/scheduled-messages`, data),

  update: (accountId: number, id: number, data: Partial<ScheduledMessageRequest>) =>
    apiClient.put<ScheduledMessageResponse>(`/api/v1/accounts/${accountId}/scheduled-messages/${id}`, data),

  cancel: (accountId: number, id: number) =>
    apiClient.post(`/api/v1/accounts/${accountId}/scheduled-messages/${id}/cancel`),

  delete: (accountId: number, id: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/scheduled-messages/${id}`),
};
