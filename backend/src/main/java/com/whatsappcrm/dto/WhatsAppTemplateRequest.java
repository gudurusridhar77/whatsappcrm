package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class WhatsAppTemplateRequest {

    @NotNull(message = "Inbox ID is required")
    private Long inboxId;

    @NotBlank(message = "Template name is required")
    private String name;

    private String language = "en_US";

    @NotBlank(message = "Category is required")
    private String category; // MARKETING, UTILITY, AUTHENTICATION

    @NotBlank(message = "Body text is required")
    private String body;

    private String headerType = "NONE"; // NONE, TEXT, IMAGE, VIDEO, DOCUMENT
    private String headerText;
    private String footerText;
    private List<TemplateButton> buttons;

    @Data
    public static class TemplateButton {
        private String type; // QUICK_REPLY, URL, PHONE_NUMBER
        private String text;
        private String url;       // for URL type
        private String phoneNumber; // for PHONE_NUMBER type
    }
}
