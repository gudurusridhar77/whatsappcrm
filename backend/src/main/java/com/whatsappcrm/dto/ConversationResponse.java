package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Conversation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@AllArgsConstructor
public class ConversationResponse {
    private Long id;
    private Long displayId;
    private String status;
    private String subject;
    private LocalDateTime lastActivityAt;
    private LocalDateTime createdAt;

    // Contact info
    private Long contactId;
    private String contactName;
    private String contactEmail;

    // Inbox info
    private Long inboxId;
    private String inboxName;
    private String channelType;

    // Assignee info
    private Long assigneeId;
    private String assigneeName;

    // Team info
    private Long teamId;
    private String teamName;

    // Message count
    private Long messageCount;

    // Last message preview
    private String lastMessage;

    // Unseen inbound messages
    private Integer unreadCount;

    // Labels
    private List<LabelSummary> labels;

    @Data
    @Builder
    @AllArgsConstructor
    public static class LabelSummary {
        private Long id;
        private String title;
        private String color;
    }

    public static ConversationResponse fromConversation(Conversation conv, Long messageCount, String lastMessage) {
        return ConversationResponse.builder()
                .id(conv.getId())
                .displayId(conv.getDisplayId())
                .status(conv.getStatus().name())
                .subject(conv.getSubject())
                .lastActivityAt(conv.getLastActivityAt())
                .createdAt(conv.getCreatedAt())
                .unreadCount(conv.getUnreadCount() == null ? 0 : conv.getUnreadCount())
                .contactId(conv.getContact().getId())
                .contactName(conv.getContact().getName())
                .contactEmail(conv.getContact().getEmail())
                .inboxId(conv.getInbox().getId())
                .inboxName(conv.getInbox().getName())
                .channelType(conv.getInbox().getChannelType().name())
                .assigneeId(conv.getAssignee() != null ? conv.getAssignee().getId() : null)
                .assigneeName(conv.getAssignee() != null ? conv.getAssignee().getName() : null)
                .teamId(conv.getTeam() != null ? conv.getTeam().getId() : null)
                .teamName(conv.getTeam() != null ? conv.getTeam().getName() : null)
                .messageCount(messageCount)
                .lastMessage(lastMessage)
                .labels(conv.getLabels() != null ? conv.getLabels().stream()
                        .map(l -> LabelSummary.builder()
                                .id(l.getId())
                                .title(l.getTitle())
                                .color(l.getColor())
                                .build())
                        .collect(Collectors.toList()) : List.of())
                .build();
    }
}
