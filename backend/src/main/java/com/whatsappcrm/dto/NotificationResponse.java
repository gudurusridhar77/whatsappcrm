package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String notificationType;
    private String category;
    private String title;
    private String message;
    private String entityType;
    private Long entityId;
    private Map<String, Object> metadata;
    private boolean read;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    public static NotificationResponse fromEntity(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .notificationType(n.getNotificationType())
                .category(n.getCategory())
                .title(n.getTitle())
                .message(n.getMessage())
                .entityType(n.getEntityType())
                .entityId(n.getEntityId())
                .metadata(n.getMetadata())
                .read(n.getReadAt() != null)
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
