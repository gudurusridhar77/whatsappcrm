package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateConversationRequest {

    @NotNull(message = "Contact ID is required")
    private Long contactId;

    @NotNull(message = "Inbox ID is required")
    private Long inboxId;

    private Long assigneeId;

    private String subject;

    private String initialMessage;
}
