import apiClient from './client';

export interface AggregateMetrics {
  totalCampaigns: number;
  completedCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalReplied: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  failureRate: number;
  sentToDeliveredDropOff: number;
  deliveredToReadDropOff: number;
  avgCompletionMinutes: number | null;
}

export interface CampaignMetrics {
  id: number;
  name: string;
  templateName: string;
  inboxName: string;
  status: string;
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  repliedCount: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  failureRate: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  durationMinutes: number | null;
}

export interface DeliveryTrendPoint {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface TemplatePerformance {
  templateId: number;
  templateName: string;
  category: string;
  timesSent: number;
  totalRecipients: number;
  totalDelivered: number;
  totalRead: number;
  totalReplied: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
}

export interface InboxCampaignMetrics {
  inboxId: number;
  inboxName: string;
  campaignCount: number;
  totalRecipients: number;
  totalDelivered: number;
  totalRead: number;
  totalReplied: number;
  deliveryRate: number;
  readRate: number;
}

export interface CampaignAnalyticsResponse {
  aggregate: AggregateMetrics;
  campaigns: CampaignMetrics[];
  deliveryTrend: DeliveryTrendPoint[];
  templatePerformance: TemplatePerformance[];
  inboxBreakdown: InboxCampaignMetrics[];
}

export const campaignAnalyticsApi = {
  getAnalytics: (accountId: number, startDate?: string, endDate?: string) =>
    apiClient.get<CampaignAnalyticsResponse>(`/api/v1/accounts/${accountId}/campaign-analytics`, {
      params: { startDate, endDate },
    }),
};
