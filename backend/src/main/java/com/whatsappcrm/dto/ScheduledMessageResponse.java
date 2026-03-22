package com.whatsappcrm.dto;

import com.whatsappcrm.entity.ScheduledMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class ScheduledMessageResponse {

    private Long id;
    private String scheduleType;
    private Long inboxId;
    private String inboxName;
    private Long contactId;
    private String contactName;
    private String contactPhone;
    private String content;
    private Long templateId;
    private String templateName;
    private List<String> bodyParams;
    private Long broadcastId;
    private String broadcastName;
    private String scheduledAt;
    private String sentAt;
    private String status;
    private String failureReason;
    private String label;
    private Long createdBy;
    private String createdAt;

    @SuppressWarnings("unchecked")
    public static ScheduledMessageResponse fromEntity(ScheduledMessage sm) {
        List<String> params = null;
        if (sm.getTemplateParams() != null && sm.getTemplateParams().containsKey("bodyParams")) {
            Object p = sm.getTemplateParams().get("bodyParams");
            if (p instanceof List) {
                params = (List<String>) p;
            }
        }

        return ScheduledMessageResponse.builder()
                .id(sm.getId())
                .scheduleType(sm.getScheduleType().name())
                .inboxId(sm.getInbox().getId())
                .inboxName(sm.getInbox().getName())
                .contactId(sm.getContact() != null ? sm.getContact().getId() : null)
                .contactName(sm.getContact() != null ? sm.getContact().getName() : null)
                .contactPhone(sm.getContact() != null ? sm.getContact().getPhoneNumber() : null)
                .content(sm.getContent())
                .templateId(sm.getTemplate() != null ? sm.getTemplate().getId() : null)
                .templateName(sm.getTemplate() != null ? sm.getTemplate().getName() : null)
                .bodyParams(params)
                .broadcastId(sm.getBroadcast() != null ? sm.getBroadcast().getId() : null)
                .broadcastName(sm.getBroadcast() != null ? sm.getBroadcast().getName() : null)
                .scheduledAt(sm.getScheduledAt() != null ? sm.getScheduledAt().toString() : null)
                .sentAt(sm.getSentAt() != null ? sm.getSentAt().toString() : null)
                .status(sm.getStatus().name())
                .failureReason(sm.getFailureReason())
                .label(sm.getLabel())
                .createdBy(sm.getCreatedBy())
                .createdAt(sm.getCreatedAt() != null ? sm.getCreatedAt().toString() : null)
                .build();
    }
}
