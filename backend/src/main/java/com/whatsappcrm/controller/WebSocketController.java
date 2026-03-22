package com.whatsappcrm.controller;

import com.whatsappcrm.service.WebSocketEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final WebSocketEventService webSocketEventService;

    /**
     * Handle typing indicator from client.
     * Client sends to: /app/typing/{accountId}/{conversationId}
     */
    @MessageMapping("/typing/{accountId}/{conversationId}")
    public void handleTyping(
            @DestinationVariable Long accountId,
            @DestinationVariable Long conversationId,
            @Payload Map<String, Object> payload,
            Principal principal) {
        String userName = principal != null ? principal.getName() : "Unknown";
        boolean isTyping = Boolean.TRUE.equals(payload.get("isTyping"));
        webSocketEventService.broadcastTyping(accountId, conversationId, userName, isTyping);
    }
}
