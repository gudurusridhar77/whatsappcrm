package com.whatsappcrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class SearchResponse {

    private List<ConversationResult> conversations;
    private List<ContactResult> contacts;
    private List<MessageResult> messages;

    @Data
    @Builder
    @AllArgsConstructor
    public static class ConversationResult {
        private Long id;
        private Long displayId;
        private String status;
        private String contactName;
        private String inboxName;
        private String assigneeName;
        private String teamName;
        private String lastMessage;
        private String createdAt;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class ContactResult {
        private Long id;
        private String name;
        private String email;
        private String phoneNumber;
        private String company;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class MessageResult {
        private Long id;
        private Long conversationId;
        private Long conversationDisplayId;
        private String contactName;
        private String content;
        private String senderName;
        private String createdAt;
    }
}
