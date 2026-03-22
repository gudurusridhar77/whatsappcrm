package com.whatsappcrm.dto;

import com.whatsappcrm.entity.WhatsAppTemplate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class WhatsAppTemplateResponse {
    private Long id;
    private Long inboxId;
    private String inboxName;
    private String name;
    private String language;
    private String status;
    private String category;
    private String body;
    private String headerType;
    private String headerText;
    private String footerText;
    private String buttonsJson;
    private Integer bodyParamCount;
    private Integer headerParamCount;
    private String externalId;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WhatsAppTemplateResponse fromEntity(WhatsAppTemplate t) {
        return WhatsAppTemplateResponse.builder()
                .id(t.getId())
                .inboxId(t.getInbox().getId())
                .inboxName(t.getInbox().getName())
                .name(t.getName())
                .language(t.getLanguage())
                .status(t.getStatus().name())
                .category(t.getCategory().name())
                .body(t.getBody())
                .headerType(t.getHeaderType())
                .headerText(t.getHeaderText())
                .footerText(t.getFooterText())
                .buttonsJson(t.getButtonsJson())
                .bodyParamCount(t.getBodyParamCount())
                .headerParamCount(t.getHeaderParamCount())
                .externalId(t.getExternalId())
                .rejectionReason(t.getRejectionReason())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
