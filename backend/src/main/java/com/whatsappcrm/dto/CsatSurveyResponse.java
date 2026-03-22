package com.whatsappcrm.dto;

import com.whatsappcrm.entity.CsatResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class CsatSurveyResponse {
    private Long id;
    private Long conversationId;
    private Long conversationDisplayId;
    private String contactName;
    private String contactEmail;
    private String agentName;
    private Integer rating;
    private String ratingLabel;
    private String feedbackText;
    private LocalDateTime submittedAt;
    private LocalDateTime createdAt;

    private static final String[] RATING_LABELS = {"", "Awful", "Bad", "Neutral", "Good", "Excellent"};

    public static CsatSurveyResponse fromEntity(CsatResponse csat) {
        return CsatSurveyResponse.builder()
                .id(csat.getId())
                .conversationId(csat.getConversation().getId())
                .conversationDisplayId(csat.getConversation().getDisplayId())
                .contactName(csat.getContact().getName())
                .contactEmail(csat.getContact().getEmail())
                .agentName(csat.getAssignedAgent() != null ? csat.getAssignedAgent().getName() : null)
                .rating(csat.getRating())
                .ratingLabel(csat.getRating() != null && csat.getRating() >= 1 && csat.getRating() <= 5
                        ? RATING_LABELS[csat.getRating()] : "Unknown")
                .feedbackText(csat.getFeedbackText())
                .submittedAt(csat.getSubmittedAt())
                .createdAt(csat.getCreatedAt())
                .build();
    }
}
