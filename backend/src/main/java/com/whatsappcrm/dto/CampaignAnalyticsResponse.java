package com.whatsappcrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class CampaignAnalyticsResponse {

    private AggregateMetrics aggregate;
    private List<CampaignMetrics> campaigns;
    private List<TimeSeriesPoint> deliveryTrend;
    private List<TemplatePerformance> templatePerformance;
    private List<InboxCampaignMetrics> inboxBreakdown;

    @Data
    @Builder
    @AllArgsConstructor
    public static class AggregateMetrics {
        private long totalCampaigns;
        private long completedCampaigns;
        private long totalRecipients;
        private long totalSent;
        private long totalDelivered;
        private long totalRead;
        private long totalFailed;
        private long totalReplied;
        // Computed rates (percentage 0-100)
        private double deliveryRate;
        private double readRate;
        private double replyRate;
        private double failureRate;
        // Funnel drop-offs
        private double sentToDeliveredDropOff;
        private double deliveredToReadDropOff;
        // Timing
        private Double avgCompletionMinutes;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class CampaignMetrics {
        private long id;
        private String name;
        private String templateName;
        private String inboxName;
        private String status;
        private int totalCount;
        private int sentCount;
        private int deliveredCount;
        private int readCount;
        private int failedCount;
        private int repliedCount;
        private double deliveryRate;
        private double readRate;
        private double replyRate;
        private double failureRate;
        private String startedAt;
        private String completedAt;
        private String createdAt;
        private Double durationMinutes;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class TimeSeriesPoint {
        private String date;
        private long sent;
        private long delivered;
        private long read;
        private long failed;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class TemplatePerformance {
        private long templateId;
        private String templateName;
        private String category;
        private long timesSent;
        private long totalRecipients;
        private long totalDelivered;
        private long totalRead;
        private long totalReplied;
        private long totalFailed;
        private double deliveryRate;
        private double readRate;
        private double replyRate;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class InboxCampaignMetrics {
        private long inboxId;
        private String inboxName;
        private long campaignCount;
        private long totalRecipients;
        private long totalDelivered;
        private long totalRead;
        private long totalReplied;
        private double deliveryRate;
        private double readRate;
    }
}
