package com.whatsappcrm.dto;

import com.whatsappcrm.entity.ActivityLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class ActivityLogResponse {
    private Long id;
    private String auditableType;
    private Long auditableId;
    private String activityType;
    private Long userId;
    private String userName;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;

    public static ActivityLogResponse fromEntity(ActivityLog log) {
        return ActivityLogResponse.builder()
                .id(log.getId())
                .auditableType(log.getAuditableType())
                .auditableId(log.getAuditableId())
                .activityType(log.getActivityType())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .userName(log.getUser() != null ? log.getUser().getName() : "System")
                .metadata(log.getMetadata())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
