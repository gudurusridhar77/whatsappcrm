import apiClient from './client';

export interface WhatsAppTemplate {
  id: number;
  inboxId: number;
  inboxName: string;
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  headerType: string;
  headerText: string | null;
  footerText: string | null;
  buttonsJson: string | null;
  bodyParamCount: number;
  headerParamCount: number;
  externalId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface CreateTemplateRequest {
  inboxId: number;
  name: string;
  language: string;
  category: string;
  body: string;
  headerType?: string;
  headerText?: string;
  footerText?: string;
  buttons?: TemplateButton[];
}

export interface SendTemplateRequest {
  templateId: number;
  senderId?: number;
  bodyParams?: string[];
  headerParams?: string[];
}

export const whatsappTemplatesApi = {
  getTemplates: (accountId: number, inboxId?: number) =>
    apiClient.get<WhatsAppTemplate[]>(`/api/v1/accounts/${accountId}/whatsapp_templates`, {
      params: inboxId ? { inboxId } : undefined,
    }),

  getTemplate: (accountId: number, templateId: number) =>
    apiClient.get<WhatsAppTemplate>(`/api/v1/accounts/${accountId}/whatsapp_templates/${templateId}`),

  createTemplate: (accountId: number, data: CreateTemplateRequest) =>
    apiClient.post<WhatsAppTemplate>(`/api/v1/accounts/${accountId}/whatsapp_templates`, data),

  updateTemplate: (accountId: number, templateId: number, data: Partial<CreateTemplateRequest>) =>
    apiClient.patch<WhatsAppTemplate>(`/api/v1/accounts/${accountId}/whatsapp_templates/${templateId}`, data),

  deleteTemplate: (accountId: number, templateId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/whatsapp_templates/${templateId}`),

  syncTemplates: (accountId: number, inboxId: number) =>
    apiClient.post<WhatsAppTemplate[]>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/sync_templates`),

  sendTemplate: (accountId: number, conversationId: number, data: SendTemplateRequest) =>
    apiClient.post(`/api/v1/accounts/${accountId}/conversations/${conversationId}/send_template`, data),
};
