package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class CreateInboxRequest {

    @NotBlank(message = "Inbox name is required")
    private String name;

    @NotNull(message = "Channel type is required")
    private String channelType;

    // WebWidget specific fields
    private String websiteUrl;
    private String welcomeTitle;
    private String welcomeTagline;
    private String widgetColor;
    private Boolean preChatFormEnabled;

    // Email specific fields
    private String emailAddress;
    private String imapHost;
    private Integer imapPort;
    private String imapUsername;
    private String imapPassword;
    private Boolean imapSsl;
    private String smtpHost;
    private Integer smtpPort;
    private String smtpUsername;
    private String smtpPassword;
    private Boolean smtpTls;
    private String forwardToEmail;
    private String signature;

    // WhatsApp specific fields
    private String whatsappPhoneNumber;
    private String whatsappPhoneNumberId;
    private String whatsappWabaId;
    private String whatsappAccessToken;
    private String whatsappBusinessName;
    private String whatsappApiBaseUrl;

    // General settings
    private Boolean greetingEnabled;
    private String greetingMessage;
    private Boolean enableAutoAssignment;
}
