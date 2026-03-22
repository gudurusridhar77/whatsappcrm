package com.whatsappcrm.dto;

import com.whatsappcrm.entity.ChannelEmail;
import com.whatsappcrm.entity.ChannelWebWidget;
import com.whatsappcrm.entity.ChannelWhatsapp;
import com.whatsappcrm.entity.Inbox;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class InboxResponse {
    private Long id;
    private String name;
    private String channelType;
    private String token;
    private Boolean greetingEnabled;
    private String greetingMessage;
    private Boolean enableAutoAssignment;
    private Boolean active;
    private Long conversationCount;
    private LocalDateTime createdAt;

    // WebWidget specific
    private WebWidgetConfig webWidgetConfig;

    // Email specific
    private EmailConfig emailConfig;

    // WhatsApp specific
    private WhatsAppConfig whatsappConfig;

    @Data
    @Builder
    @AllArgsConstructor
    public static class WebWidgetConfig {
        private String websiteUrl;
        private String welcomeTitle;
        private String welcomeTagline;
        private String widgetColor;
        private String replyTime;
        private Boolean preChatFormEnabled;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class EmailConfig {
        private String emailAddress;
        private Boolean imapEnabled;
        private String imapHost;
        private Integer imapPort;
        private Boolean imapSsl;
        private Boolean smtpEnabled;
        private String smtpHost;
        private Integer smtpPort;
        private Boolean smtpTls;
        private String forwardToEmail;
        private String signature;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class WhatsAppConfig {
        private String phoneNumber;
        private String phoneNumberId;
        private String wabaId;
        private String businessName;
        private String apiBaseUrl;
        private String webhookVerifyToken;
        private String provider;
        private Boolean messageTemplatesEnabled;
    }

    public static InboxResponse fromInbox(Inbox inbox, ChannelWebWidget widget) {
        return fromInbox(inbox, widget, null, null);
    }

    public static InboxResponse fromInbox(Inbox inbox, ChannelWebWidget widget, ChannelEmail email) {
        return fromInbox(inbox, widget, email, null);
    }

    public static InboxResponse fromInbox(Inbox inbox, ChannelWebWidget widget, ChannelEmail email, ChannelWhatsapp whatsapp) {
        InboxResponseBuilder builder = InboxResponse.builder()
                .id(inbox.getId())
                .name(inbox.getName())
                .channelType(inbox.getChannelType().name())
                .token(inbox.getToken())
                .greetingEnabled(inbox.getGreetingEnabled())
                .greetingMessage(inbox.getGreetingMessage())
                .enableAutoAssignment(inbox.getEnableAutoAssignment())
                .active(inbox.getActive())
                .createdAt(inbox.getCreatedAt());

        if (widget != null) {
            builder.webWidgetConfig(WebWidgetConfig.builder()
                    .websiteUrl(widget.getWebsiteUrl())
                    .welcomeTitle(widget.getWelcomeTitle())
                    .welcomeTagline(widget.getWelcomeTagline())
                    .widgetColor(widget.getWidgetColor())
                    .replyTime(widget.getReplyTime())
                    .preChatFormEnabled(widget.getPreChatFormEnabled())
                    .build());
        }

        if (email != null) {
            builder.emailConfig(EmailConfig.builder()
                    .emailAddress(email.getEmailAddress())
                    .imapEnabled(email.getImapEnabled())
                    .imapHost(email.getImapHost())
                    .imapPort(email.getImapPort())
                    .imapSsl(email.getImapSsl())
                    .smtpEnabled(email.getSmtpEnabled())
                    .smtpHost(email.getSmtpHost())
                    .smtpPort(email.getSmtpPort())
                    .smtpTls(email.getSmtpTls())
                    .forwardToEmail(email.getForwardToEmail())
                    .signature(email.getSignature())
                    .build());
        }

        if (whatsapp != null) {
            builder.whatsappConfig(WhatsAppConfig.builder()
                    .phoneNumber(whatsapp.getPhoneNumber())
                    .phoneNumberId(whatsapp.getPhoneNumberId())
                    .wabaId(whatsapp.getWabaId())
                    .businessName(whatsapp.getBusinessName())
                    .apiBaseUrl(whatsapp.getApiBaseUrl())
                    .webhookVerifyToken(whatsapp.getWebhookVerifyToken())
                    .provider(whatsapp.getProvider())
                    .messageTemplatesEnabled(whatsapp.getMessageTemplatesEnabled())
                    .build());
        }

        return builder.build();
    }

    public static InboxResponse fromInbox(Inbox inbox) {
        return fromInbox(inbox, null, null, null);
    }
}
