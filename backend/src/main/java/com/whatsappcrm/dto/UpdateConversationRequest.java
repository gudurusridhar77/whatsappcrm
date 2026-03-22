package com.whatsappcrm.dto;

import lombok.Data;

@Data
public class UpdateConversationRequest {
    private String status;
    private Long assigneeId;
    private Long teamId;
    private String subject;
}
