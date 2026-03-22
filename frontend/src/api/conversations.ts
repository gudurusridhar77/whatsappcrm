import apiClient from './client';

export interface ConversationResponse {
  id: number;
  displayId: number;
  status: string;
  subject: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  contactId: number;
  contactName: string;
  contactEmail: string | null;
  inboxId: number;
  inboxName: string;
  channelType: string;
  assigneeId: number | null;
  assigneeName: string | null;
  teamId: number | null;
  teamName: string | null;
  messageCount: number;
  lastMessage: string | null;
  labels: { id: number; title: string; color: string }[];
}

export interface ConversationPage {
  content: ConversationResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface AttachmentResponse {
  id: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  fileType: string;
  dataUrl: string;
  thumbUrl: string | null;
  createdAt: string;
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface InteractiveData {
  header?: string;
  body: string;
  footer?: string;
  buttons?: InteractiveButton[];
  buttonText?: string;
  sections?: ListSection[];
}

export interface MessageResponse {
  id: number;
  content: string;
  messageType: string;
  senderType: string | null;
  senderId: number | null;
  senderName: string | null;
  privateFlag: boolean;
  deliveryStatus?: string;
  contentType?: string;
  contentAttributes?: Record<string, any>;
  createdAt: string;
  attachments?: AttachmentResponse[];
}

export interface MessagePage {
  content: MessageResponse[];
  totalElements: number;
  totalPages: number;
}

export interface ConversationCounts {
  open: number;
  pending: number;
  resolved: number;
  snoozed: number;
}

export const conversationsApi = {
  getConversations: (accountId: number, params: { status?: string; assigneeId?: number; inboxId?: number; labelId?: number; page?: number } = {}) =>
    apiClient.get<ConversationPage>(`/api/v1/accounts/${accountId}/conversations`, { params }),

  getCounts: (accountId: number) =>
    apiClient.get<ConversationCounts>(`/api/v1/accounts/${accountId}/conversations/counts`),

  getConversation: (accountId: number, conversationId: number) =>
    apiClient.get<ConversationResponse>(`/api/v1/accounts/${accountId}/conversations/${conversationId}`),

  createConversation: (accountId: number, data: { contactId: number; inboxId: number; assigneeId?: number; subject?: string; initialMessage?: string }) =>
    apiClient.post<ConversationResponse>(`/api/v1/accounts/${accountId}/conversations`, data),

  updateConversation: (accountId: number, conversationId: number, data: { status?: string; assigneeId?: number; teamId?: number }) =>
    apiClient.patch<ConversationResponse>(`/api/v1/accounts/${accountId}/conversations/${conversationId}`, data),

  getMessages: (accountId: number, conversationId: number, page = 0) =>
    apiClient.get<MessagePage>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, { params: { page, size: 50 } }),

  sendMessage: (accountId: number, conversationId: number, data: { content: string; messageType?: string; privateFlag?: boolean }) =>
    apiClient.post<MessageResponse>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, data),

  sendInteractiveMessage: (accountId: number, conversationId: number, data: {
    content?: string;
    contentType: string;
    interactiveData: InteractiveData;
  }) =>
    apiClient.post<MessageResponse>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, data),

  sendMessageWithAttachments: (accountId: number, conversationId: number, data: {
    content?: string;
    messageType?: string;
    privateFlag?: boolean;
    files: File[];
  }) => {
    const formData = new FormData();
    formData.append('content', data.content || '');
    if (data.messageType) formData.append('messageType', data.messageType);
    formData.append('privateFlag', String(data.privateFlag || false));
    data.files.forEach(file => formData.append('files', file));
    return apiClient.post<MessageResponse>(
      `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/with-attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};
