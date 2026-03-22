package com.whatsappcrm.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Service to broadcast real-time events via WebSocket.
 *
 * Topic structure:
 *   /topic/accounts/{accountId}/conversations         → conversation list updates
 *   /topic/accounts/{accountId}/conversations/{id}    → new messages in a conversation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast when a new conversation is created or status changes
     */
    public void broadcastConversationUpdate(Long accountId, Object conversationData) {
        String dest = "/topic/accounts/" + accountId + "/conversations";
        log.debug("Broadcasting conversation update to {}", dest);
        messagingTemplate.convertAndSend(dest, Map.of(
                "event", "conversation.updated",
                "data", conversationData
        ));
    }

    /**
     * Broadcast when a new message is sent in a conversation
     */
    public void broadcastNewMessage(Long accountId, Long conversationId, Object messageData) {
        String dest = "/topic/accounts/" + accountId + "/conversations/" + conversationId;
        log.debug("Broadcasting new message to {}", dest);
        messagingTemplate.convertAndSend(dest, Map.of(
                "event", "message.created",
                "data", messageData
        ));
    }

    /**
     * Broadcast conversation status change
     */
    public void broadcastStatusChange(Long accountId, Long conversationId, String newStatus) {
        String dest = "/topic/accounts/" + accountId + "/conversations";
        messagingTemplate.convertAndSend(dest, Map.of(
                "event", "conversation.status_changed",
                "data", Map.of("conversationId", conversationId, "status", newStatus)
        ));
    }

    /**
     * Broadcast message to widget subscriber (visitor's browser)
     */
    public void broadcastWidgetMessage(Long conversationId, Object messageData) {
        String dest = "/topic/widget/conversations/" + conversationId;
        log.debug("Broadcasting widget message to {}", dest);
        messagingTemplate.convertAndSend(dest, Map.of(
                "event", "widget.message",
                "data", messageData
        ));
    }

    /**
     * Broadcast message delivery status update
     */
    public void sendMessageStatusUpdate(Long accountId, Long conversationId, Long messageId, String status) {
        String dest = "/topic/accounts/" + accountId + "/conversations/" + conversationId;
        log.debug("Broadcasting message status update to {}", dest);
        messagingTemplate.convertAndSend(dest, Map.of(
                "event", "message.status_updated",
                "data", Map.of("messageId", messageId, "deliveryStatus", status)
        ));
    }

    /**
     * Broadcast typing indicator
     */
    public void broadcastTyping(Long accountId, Long conversationId, String userName, boolean isTyping) {
        String dest = "/topic/accounts/" + accountId + "/conversations/" + conversationId;
        messagingTemplate.convertAndSend(dest, Map.of(
                "event", "typing",
                "data", Map.of("userName", userName, "isTyping", isTyping)
        ));
    }
}
