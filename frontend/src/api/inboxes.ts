import apiClient from './client';

export interface WebWidgetConfig {
  websiteUrl: string | null;
  welcomeTitle: string;
  welcomeTagline: string;
  widgetColor: string;
  replyTime: string;
  preChatFormEnabled: boolean;
}

export interface EmailConfig {
  emailAddress: string;
  imapEnabled: boolean;
  imapHost: string | null;
  imapPort: number | null;
  imapSsl: boolean;
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpTls: boolean;
  forwardToEmail: string | null;
  signature: string | null;
}

export interface WhatsAppConfig {
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string | null;
  businessName: string | null;
  apiBaseUrl: string;
  webhookVerifyToken: string;
  provider: string;
  messageTemplatesEnabled: boolean;
}

export interface Inbox {
  id: number;
  name: string;
  channelType: string;
  token: string;
  greetingEnabled: boolean;
  greetingMessage: string | null;
  enableAutoAssignment: boolean;
  active: boolean;
  conversationCount: number;
  createdAt: string;
  webWidgetConfig: WebWidgetConfig | null;
  emailConfig: EmailConfig | null;
  whatsappConfig: WhatsAppConfig | null;
}

export interface CreateInboxRequest {
  name: string;
  channelType: string;
  // WebWidget
  websiteUrl?: string;
  welcomeTitle?: string;
  welcomeTagline?: string;
  widgetColor?: string;
  preChatFormEnabled?: boolean;
  // Email
  emailAddress?: string;
  imapHost?: string;
  imapPort?: number;
  imapUsername?: string;
  imapPassword?: string;
  imapSsl?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpTls?: boolean;
  forwardToEmail?: string;
  signature?: string;
  // WhatsApp
  whatsappPhoneNumber?: string;
  whatsappPhoneNumberId?: string;
  whatsappWabaId?: string;
  whatsappAccessToken?: string;
  whatsappBusinessName?: string;
  whatsappApiBaseUrl?: string;
  // General
  greetingEnabled?: boolean;
  greetingMessage?: string;
}

export const inboxesApi = {
  getInboxes: (accountId: number) =>
    apiClient.get<Inbox[]>(`/api/v1/accounts/${accountId}/inboxes`),

  getInbox: (accountId: number, inboxId: number) =>
    apiClient.get<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`),

  createInbox: (accountId: number, data: CreateInboxRequest) =>
    apiClient.post<Inbox>(`/api/v1/accounts/${accountId}/inboxes`, data),

  updateInbox: (accountId: number, inboxId: number, data: Partial<CreateInboxRequest>) =>
    apiClient.patch<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, data),

  deleteInbox: (accountId: number, inboxId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`),

  testSmtp: (accountId: number, inboxId: number) =>
    apiClient.post<{ success: boolean }>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/test_smtp`),

  sendEmailReply: (accountId: number, conversationId: number, content: string) =>
    apiClient.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/email_reply`, { content }),

  sendWhatsAppReply: (accountId: number, conversationId: number, content: string, senderId?: number) =>
    apiClient.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/whatsapp_reply`, { content, senderId }),

  sendWhatsAppTemplate: (accountId: number, conversationId: number, templateName: string, languageCode?: string, senderId?: number) =>
    apiClient.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/whatsapp_template`, { templateName, languageCode, senderId }),
};
