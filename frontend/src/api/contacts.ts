import apiClient from './client';

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  company: string | null;
  description: string | null;
  avatarUrl: string | null;
  customAttributes: Record<string, any>;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface ContactPage {
  content: Contact[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ContactRequest {
  name: string;
  email?: string;
  phoneNumber?: string;
  company?: string;
  description?: string;
  customAttributes?: Record<string, any>;
}

export const contactsApi = {
  getContacts: (accountId: number, page = 0, size = 20, search = '') =>
    apiClient.get<ContactPage>(`/api/v1/accounts/${accountId}/contacts`, {
      params: { page, size, search },
    }),

  getContact: (accountId: number, contactId: number) =>
    apiClient.get<Contact>(`/api/v1/accounts/${accountId}/contacts/${contactId}`),

  createContact: (accountId: number, data: ContactRequest) =>
    apiClient.post<Contact>(`/api/v1/accounts/${accountId}/contacts`, data),

  updateContact: (accountId: number, contactId: number, data: ContactRequest) =>
    apiClient.put<Contact>(`/api/v1/accounts/${accountId}/contacts/${contactId}`, data),

  deleteContact: (accountId: number, contactId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/contacts/${contactId}`),

  importContacts: (accountId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ContactImportResult>(`/api/v1/accounts/${accountId}/contacts/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export interface ContactImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}
