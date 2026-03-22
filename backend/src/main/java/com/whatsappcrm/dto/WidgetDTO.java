package com.whatsappcrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class WidgetDTO {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WidgetConfig {
        private String inboxName;
        private String welcomeTitle;
        private String welcomeTagline;
        private String widgetColor;
        private String replyTime;
        private boolean preChatFormEnabled;
        private boolean greetingEnabled;
        private String greetingMessage;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StartConversationRequest {
        private String name;
        private String email;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WidgetMessageRequest {
        private String content;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WidgetConversation {
        private Long id;
        private String token;
        private String contactName;
        private String status;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WidgetMessage {
        private Long id;
        private String content;
        private String messageType;
        private String senderName;
        private String createdAt;
    }
}
