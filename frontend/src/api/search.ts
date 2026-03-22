import apiClient from './client';

export interface ConversationResult {
  id: number;
  displayId: number;
  status: string;
  contactName: string;
  inboxName: string;
  assigneeName: string | null;
  teamName: string | null;
  lastMessage: string | null;
  createdAt: string | null;
}

export interface ContactResult {
  id: number;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  company: string | null;
}

export interface MessageResult {
  id: number;
  conversationId: number;
  conversationDisplayId: number;
  contactName: string;
  content: string;
  senderName: string | null;
  createdAt: string | null;
}

export interface SearchResponse {
  conversations: ConversationResult[];
  contacts: ContactResult[];
  messages: MessageResult[];
}

export const searchApi = {
  search: (accountId: number, query: string) =>
    apiClient.get<SearchResponse>(`/api/v1/accounts/${accountId}/search`, { params: { q: query } }),
};
