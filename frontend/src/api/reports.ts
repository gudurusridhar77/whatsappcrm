import apiClient from './client';

export interface OverviewMetrics {
  totalConversations: number;
  openConversations: number;
  resolvedConversations: number;
  pendingConversations: number;
  totalMessages: number;
  totalContacts: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface AgentMetrics {
  agentId: number;
  agentName: string;
  assignedConversations: number;
  resolvedConversations: number;
  messagesSent: number;
  avgFirstResponseMinutes: number | null;
}

export interface InboxMetrics {
  inboxId: number;
  inboxName: string;
  channelType: string;
  conversationCount: number;
  messageCount: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface LabelCount {
  labelId: number;
  labelTitle: string;
  color: string;
  count: number;
}

export interface TeamMetrics {
  teamId: number;
  teamName: string;
  assignedConversations: number;
  resolvedConversations: number;
}

export interface ReportResponse {
  overview: OverviewMetrics;
  conversationTrend: TimeSeriesPoint[];
  messageTrend: TimeSeriesPoint[];
  agentPerformance: AgentMetrics[];
  inboxBreakdown: InboxMetrics[];
  statusDistribution: StatusCount[];
  topLabels: LabelCount[];
  teamPerformance: TeamMetrics[];
}

export const reportsApi = {
  getReport: (accountId: number, startDate?: string, endDate?: string) =>
    apiClient.get<ReportResponse>(`/api/v1/accounts/${accountId}/reports`, {
      params: { startDate, endDate },
    }),
};
