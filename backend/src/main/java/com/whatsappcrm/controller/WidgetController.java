package com.whatsappcrm.controller;

import com.whatsappcrm.dto.WidgetDTO;
import com.whatsappcrm.service.WidgetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public endpoints for the embeddable live chat widget.
 * All endpoints under /public/** are unauthenticated (see SecurityConfig).
 */
@RestController
@RequestMapping("/public/widget")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Widget can be embedded on any website
public class WidgetController {

    private final WidgetService widgetService;

    /**
     * Get widget configuration (colors, welcome text, pre-chat form setting)
     */
    @GetMapping("/config/{inboxToken}")
    public ResponseEntity<WidgetDTO.WidgetConfig> getConfig(@PathVariable String inboxToken) {
        return ResponseEntity.ok(widgetService.getWidgetConfig(inboxToken));
    }

    /**
     * Start or resume a conversation from the widget
     */
    @PostMapping("/{inboxToken}/conversations")
    public ResponseEntity<WidgetDTO.WidgetConversation> startConversation(
            @PathVariable String inboxToken,
            @RequestBody WidgetDTO.StartConversationRequest request,
            @RequestHeader(value = "X-Widget-Session", required = false, defaultValue = "") String sessionToken) {

        // Generate session token if not provided
        if (sessionToken.isEmpty()) {
            sessionToken = java.util.UUID.randomUUID().toString();
        }

        return ResponseEntity.ok(widgetService.startConversation(inboxToken, request, sessionToken));
    }

    /**
     * Get messages for a widget conversation
     */
    @GetMapping("/conversations/{conversationToken}/messages")
    public ResponseEntity<List<WidgetDTO.WidgetMessage>> getMessages(@PathVariable String conversationToken) {
        return ResponseEntity.ok(widgetService.getMessages(conversationToken));
    }

    /**
     * Send a message from the widget visitor
     */
    @PostMapping("/conversations/{conversationToken}/messages")
    public ResponseEntity<WidgetDTO.WidgetMessage> sendMessage(
            @PathVariable String conversationToken,
            @RequestBody WidgetDTO.WidgetMessageRequest request) {
        return ResponseEntity.ok(widgetService.sendMessage(conversationToken, request));
    }
}
