package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Broadcast;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class BroadcastResponse {
    private Long id;
    private String name;
    private String description;
    private Long inboxId;
    private String inboxName;
    private Long templateId;
    private String templateName;
    private String status;
    private Integer totalCount;
    private Integer sentCount;
    private Integer deliveredCount;
    private Integer readCount;
    private Integer failedCount;
    private Integer repliedCount;
    private LocalDateTime scheduledAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    public static BroadcastResponse fromEntity(Broadcast b) {
        return BroadcastResponse.builder()
                .id(b.getId())
                .name(b.getName())
                .description(b.getDescription())
                .inboxId(b.getInbox().getId())
                .inboxName(b.getInbox().getName())
                .templateId(b.getTemplate() != null ? b.getTemplate().getId() : null)
                .templateName(b.getTemplate() != null ? b.getTemplate().getName() : null)
                .status(b.getStatus().name())
                .totalCount(b.getTotalCount())
                .sentCount(b.getSentCount())
                .deliveredCount(b.getDeliveredCount())
                .readCount(b.getReadCount())
                .failedCount(b.getFailedCount())
                .repliedCount(b.getRepliedCount())
                .scheduledAt(b.getScheduledAt())
                .startedAt(b.getStartedAt())
                .completedAt(b.getCompletedAt())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
