import apiClient from './client';
import axios from 'axios';

export interface CsatSurveyResponse {
  id: number;
  conversationId: number;
  conversationDisplayId: number;
  contactName: string;
  contactEmail: string | null;
  agentName: string | null;
  rating: number;
  ratingLabel: string;
  feedbackText: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface CsatPage {
  content: CsatSurveyResponse[];
  totalElements: number;
  totalPages: number;
}

export interface RatingCount {
  rating: number;
  label: string;
  count: number;
  percentage: number;
}

export interface AgentCsat {
  agentId: number;
  agentName: string;
  averageRating: number;
}

export interface CsatReportResponse {
  averageRating: number | null;
  totalResponses: number;
  pendingSurveys: number;
  satisfactionScore: number | null;
  distribution: RatingCount[];
  agentScores: AgentCsat[];
}

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const csatApi = {
  createSurvey: (accountId: number, conversationId: number) =>
    apiClient.post<{ token: string; surveyUrl: string }>(
      `/api/v1/accounts/${accountId}/conversations/${conversationId}/csat`),

  getResponses: (accountId: number, agentId?: number, page = 0) =>
    apiClient.get<CsatPage>(`/api/v1/accounts/${accountId}/csat/responses`, {
      params: { agentId, page, size: 20 },
    }),

  getReport: (accountId: number, startDate?: string, endDate?: string) =>
    apiClient.get<CsatReportResponse>(`/api/v1/accounts/${accountId}/csat/report`, {
      params: { startDate, endDate },
    }),

  // Public (no auth)
  getSurvey: (token: string) =>
    axios.get<CsatSurveyResponse>(`${BASE}/public/csat/${token}`),

  submitSurvey: (token: string, rating: number, feedbackText?: string) =>
    axios.post<CsatSurveyResponse>(`${BASE}/public/csat/${token}`, { rating, feedbackText }),
};
