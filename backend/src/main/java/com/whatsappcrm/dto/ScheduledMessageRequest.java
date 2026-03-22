package com.whatsappcrm.dto;

import lombok.Data;

import java.util.List;

@Data
public class ScheduledMessageRequest {

    private String scheduleType;   // DIRECT, TEMPLATE, BROADCAST
    private Long inboxId;
    private Long contactId;        // For DIRECT / TEMPLATE
    private String content;        // For DIRECT
    private Long templateId;       // For TEMPLATE
    private List<String> bodyParams; // For TEMPLATE
    private Long broadcastId;      // For BROADCAST
    private String scheduledAt;    // ISO datetime: "2026-03-23T10:00:00"
    private String label;          // Optional note
}
