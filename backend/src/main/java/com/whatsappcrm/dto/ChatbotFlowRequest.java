package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class ChatbotFlowRequest {

    @NotBlank(message = "Flow name is required")
    private String name;

    private String description;

    private Long inboxId;

    @NotBlank(message = "Trigger type is required")
    private String triggerType;

    private String triggerKeywords;

    private Map<String, Object> flowData;

    private Boolean active;

    private Integer priority;
}
