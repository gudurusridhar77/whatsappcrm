package com.whatsappcrm.dto;

import com.whatsappcrm.entity.ContactConsent;
import com.whatsappcrm.entity.ConsentAuditLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@AllArgsConstructor
public class ConsentResponse {

    private Long id;
    private Long contactId;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String status;        // OPT_IN or OPT_OUT
    private String source;        // AUTO_KEYWORD, MANUAL, IMPORT, API
    private String triggerKeyword;
    private String optedInAt;
    private String optedOutAt;
    private String notes;
    private Long updatedBy;
    private String updatedAt;
    private String createdAt;

    public static ConsentResponse fromEntity(ContactConsent cc) {
        return ConsentResponse.builder()
                .id(cc.getId())
                .contactId(cc.getContact().getId())
                .contactName(cc.getContact().getName())
                .contactPhone(cc.getContact().getPhoneNumber())
                .contactEmail(cc.getContact().getEmail())
                .status(cc.getStatus().name())
                .source(cc.getSource().name())
                .triggerKeyword(cc.getTriggerKeyword())
                .optedInAt(cc.getOptedInAt() != null ? cc.getOptedInAt().toString() : null)
                .optedOutAt(cc.getOptedOutAt() != null ? cc.getOptedOutAt().toString() : null)
                .notes(cc.getNotes())
                .updatedBy(cc.getUpdatedBy())
                .updatedAt(cc.getUpdatedAt() != null ? cc.getUpdatedAt().toString() : null)
                .createdAt(cc.getCreatedAt() != null ? cc.getCreatedAt().toString() : null)
                .build();
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class AuditEntry {
        private Long id;
        private String previousStatus;
        private String newStatus;
        private String source;
        private String triggerKeyword;
        private String notes;
        private Long performedBy;
        private String createdAt;

        public static AuditEntry fromEntity(ConsentAuditLog log) {
            return AuditEntry.builder()
                    .id(log.getId())
                    .previousStatus(log.getPreviousStatus() != null ? log.getPreviousStatus().name() : null)
                    .newStatus(log.getNewStatus().name())
                    .source(log.getSource().name())
                    .triggerKeyword(log.getTriggerKeyword())
                    .notes(log.getNotes())
                    .performedBy(log.getPerformedBy())
                    .createdAt(log.getCreatedAt() != null ? log.getCreatedAt().toString() : null)
                    .build();
        }
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class ConsentStats {
        private long totalContacts;
        private long optedIn;
        private long optedOut;
        private double optInRate;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class ConsentDetailResponse {
        private ConsentResponse consent;
        private List<AuditEntry> auditTrail;
    }
}
