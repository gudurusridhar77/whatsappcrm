package com.whatsappcrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class CsatReportResponse {
    private Double averageRating;
    private long totalResponses;
    private long pendingSurveys;
    private Double satisfactionScore; // percentage of 4 and 5 ratings
    private List<RatingCount> distribution;
    private List<AgentCsat> agentScores;

    @Data
    @Builder
    @AllArgsConstructor
    public static class RatingCount {
        private int rating;
        private String label;
        private long count;
        private double percentage;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class AgentCsat {
        private Long agentId;
        private String agentName;
        private Double averageRating;
    }
}
