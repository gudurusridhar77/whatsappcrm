package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BroadcastRequest {

    @NotBlank(message = "Broadcast name is required")
    private String name;

    private String description;

    @NotNull(message = "Inbox ID is required")
    private Long inboxId;

    @NotNull(message = "Template ID is required")
    private Long templateId;

    // List of contact IDs to send to (if null, sends to all contacts with phone numbers)
    private List<Long> contactIds;

    // Default parameter values for the template (used for all contacts)
    private List<String> defaultBodyParams;

    // Scheduled time (null = send immediately)
    private String scheduledAt;
}
