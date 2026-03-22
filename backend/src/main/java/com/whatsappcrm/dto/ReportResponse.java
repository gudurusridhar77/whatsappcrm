package com.whatsappcrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReportResponse {

    private OverviewMetrics overview;
    private List<TimeSeriesPoint> conversationTrend;
    private List<TimeSeriesPoint> messageTrend;
    private List<AgentMetrics> agentPerformance;
    private List<InboxMetrics> inboxBreakdown;
    private List<StatusCount> statusDistribution;
    private List<LabelCount> topLabels;
    private List<TeamMetrics> teamPerformance;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OverviewMetrics {
        private long totalConversations;
        private long openConversations;
        private long resolvedConversations;
        private long pendingConversations;
        private long totalMessages;
        private long totalContacts;
        private Double avgFirstResponseMinutes;
        private Double avgResolutionMinutes;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TimeSeriesPoint {
        private String date;
        private long count;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AgentMetrics {
        private Long agentId;
        private String agentName;
        private long assignedConversations;
        private long resolvedConversations;
        private long messagesSent;
        private Double avgFirstResponseMinutes;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class InboxMetrics {
        private Long inboxId;
        private String inboxName;
        private String channelType;
        private long conversationCount;
        private long messageCount;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class StatusCount {
        private String status;
        private long count;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LabelCount {
        private Long labelId;
        private String labelTitle;
        private String color;
        private long count;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TeamMetrics {
        private Long teamId;
        private String teamName;
        private long assignedConversations;
        private long resolvedConversations;
    }
}
