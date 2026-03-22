package com.whatsappcrm.dto;

import lombok.Data;

@Data
public class UpdateInboxRequest {
    private String name;
    private Boolean greetingEnabled;
    private String greetingMessage;
    private Boolean enableAutoAssignment;
    private Boolean active;

    // WebWidget specific
    private String websiteUrl;
    private String welcomeTitle;
    private String welcomeTagline;
    private String widgetColor;
    private Boolean preChatFormEnabled;

    // Email specific
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

    // WhatsApp specific
    private String whatsappPhoneNumber;
    private String whatsappPhoneNumberId;
    private String whatsappWabaId;
    private String whatsappAccessToken;
    private String whatsappBusinessName;
    private String whatsappApiBaseUrl;
}
