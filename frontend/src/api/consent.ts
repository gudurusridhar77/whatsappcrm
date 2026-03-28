import apiClient from './client';

export interface ConsentResponse {
  id: number | null;
  contactId: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  status: 'OPT_IN' | 'OPT_OUT';
  source: 'AUTO_KEYWORD' | 'MANUAL' | 'IMPORT' | 'API';
  triggerKeyword: string | null;
  optedInAt: string | null;
  optedOutAt: string | null;
  notes: string | null;
  updatedBy: number | null;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface AuditEntry {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  source: string;
  triggerKeyword: string | null;
  notes: string | null;
  performedBy: number | null;
  createdAt: string;
}

export interface ConsentDetailResponse {
  consent: ConsentResponse;
  auditTrail: AuditEntry[];
}

export interface ConsentStats {
  totalContacts: number;
  optedIn: number;
  optedOut: number;
  optInRate: number;
}

export interface ConsentUpdateRequest {
  status: 'OPT_IN' | 'OPT_OUT';
  notes?: string;
}

export const consentApi = {
  getAll: (accountId: number, status?: string) =>
    apiClient.get<ConsentResponse[]>(`/api/v1/accounts/${accountId}/consent`, {
      params: status ? { status } : undefined,
    }),

  getDetail: (accountId: number, contactId: number) =>
    apiClient.get<ConsentDetailResponse>(`/api/v1/accounts/${accountId}/consent/contacts/${contactId}`),

  update: (accountId: number, contactId: number, data: ConsentUpdateRequest) =>
    apiClient.put<ConsentResponse>(`/api/v1/accounts/${accountId}/consent/contacts/${contactId}`, data),

  getStats: (accountId: number) =>
    apiClient.get<ConsentStats>(`/api/v1/accounts/${accountId}/consent/stats`),

  bulkOptOut: (accountId: number, contactIds: number[], notes?: string) =>
    apiClient.post<{ optedOutCount: number }>(`/api/v1/accounts/${accountId}/consent/bulk-opt-out`, {
      contactIds,
      notes: notes || 'Bulk opt-out',
    }),

  canSend: (accountId: number, contactId: number) =>
    apiClient.get<{ canSend: boolean }>(`/api/v1/accounts/${accountId}/consent/contacts/${contactId}/can-send`),
};
