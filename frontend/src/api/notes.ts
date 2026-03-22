import apiClient from './client';

export interface NoteResponse {
  id: number;
  content: string;
  userId: number;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotePage {
  content: NoteResponse[];
  totalElements: number;
  totalPages: number;
}

export interface ActivityLogResponse {
  id: number;
  auditableType: string;
  auditableId: number;
  activityType: string;
  userId: number | null;
  userName: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface ActivityLogPage {
  content: ActivityLogResponse[];
  totalElements: number;
  totalPages: number;
}

export const notesApi = {
  getNotes: (accountId: number, contactId: number, page = 0) =>
    apiClient.get<NotePage>(`/api/v1/accounts/${accountId}/contacts/${contactId}/notes`, { params: { page } }),

  createNote: (accountId: number, contactId: number, content: string) =>
    apiClient.post<NoteResponse>(`/api/v1/accounts/${accountId}/contacts/${contactId}/notes`, { content }),

  updateNote: (accountId: number, contactId: number, noteId: number, content: string) =>
    apiClient.patch<NoteResponse>(`/api/v1/accounts/${accountId}/contacts/${contactId}/notes/${noteId}`, { content }),

  deleteNote: (accountId: number, contactId: number, noteId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/contacts/${contactId}/notes/${noteId}`),
};

export const activityLogsApi = {
  getContactLogs: (accountId: number, contactId: number, page = 0) =>
    apiClient.get<ActivityLogPage>(`/api/v1/accounts/${accountId}/contacts/${contactId}/activity_logs`, { params: { page } }),

  getConversationLogs: (accountId: number, conversationId: number, page = 0) =>
    apiClient.get<ActivityLogPage>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/activity_logs`, { params: { page } }),

  getAllLogs: (accountId: number, page = 0) =>
    apiClient.get<ActivityLogPage>(`/api/v1/accounts/${accountId}/activity_logs`, { params: { page } }),
};
