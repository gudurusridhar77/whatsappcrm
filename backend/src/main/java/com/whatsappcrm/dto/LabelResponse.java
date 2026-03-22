package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Label;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class LabelResponse {
    private Long id;
    private String title;
    private String description;
    private String color;
    private Boolean showOnSidebar;
    private Long conversationCount;
    private LocalDateTime createdAt;

    public static LabelResponse fromLabel(Label label, Long conversationCount) {
        return LabelResponse.builder()
                .id(label.getId())
                .title(label.getTitle())
                .description(label.getDescription())
                .color(label.getColor())
                .showOnSidebar(label.getShowOnSidebar())
                .conversationCount(conversationCount)
                .createdAt(label.getCreatedAt())
                .build();
    }
}
