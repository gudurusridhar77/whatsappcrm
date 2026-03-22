package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SendTemplateRequest {

    @NotNull(message = "Template ID is required")
    private Long templateId;

    private Long senderId;

    // Parameter values to fill in template placeholders: {{1}}, {{2}}, etc.
    private List<String> bodyParams;

    // Header parameter values (if header has variables)
    private List<String> headerParams;
}
