package com.whatsappcrm.controller;

import com.whatsappcrm.service.WhatsAppChannelService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookController {

    private final WhatsAppChannelService whatsAppChannelService;

    /**
     * Meta Webhook Verification (GET)
     * Meta sends a GET request to verify the webhook URL.
     * We need to respond with the hub.challenge value if the token matches.
     */
    @GetMapping("/public/whatsapp/webhook")
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String verifyToken,
            @RequestParam("hub.challenge") String challenge) {

        log.info("WhatsApp webhook verification request: mode={}, token={}", mode, verifyToken);

        if (whatsAppChannelService.verifyWebhook(mode, verifyToken, null)) {
            log.info("WhatsApp webhook verified successfully");
            return ResponseEntity.ok(challenge);
        }

        log.warn("WhatsApp webhook verification failed");
        return ResponseEntity.status(403).body("Verification failed");
    }

    /**
     * Meta Webhook Events (POST)
     * Receives incoming messages and status updates from WhatsApp.
     */
    @PostMapping("/public/whatsapp/webhook")
    public ResponseEntity<String> receiveWebhook(@RequestBody String payload) {
        log.info("Received WhatsApp webhook event");
        log.debug("WhatsApp webhook payload: {}", payload);

        whatsAppChannelService.processWebhookEvent(payload);

        // Always return 200 OK quickly to Meta (they retry on failure)
        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    /**
     * Send WhatsApp message from a conversation (authenticated endpoint)
     */
    @PostMapping("/api/v1/accounts/{accountId}/conversations/{conversationId}/whatsapp_reply")
    public ResponseEntity<Map<String, String>> sendWhatsAppReply(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        Long senderId = body.get("senderId") != null ? Long.parseLong(body.get("senderId")) : null;
        whatsAppChannelService.sendWhatsAppMessage(accountId, conversationId, content, senderId);
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    /**
     * Send WhatsApp template message (for initiating conversations outside 24h window)
     */
    @PostMapping("/api/v1/accounts/{accountId}/conversations/{conversationId}/whatsapp_template")
    public ResponseEntity<Map<String, String>> sendTemplateMessage(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestBody TemplateMessageRequest request) {
        whatsAppChannelService.sendTemplateMessage(
                accountId, conversationId,
                request.getTemplateName(), request.getLanguageCode(),
                request.getSenderId());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @Data
    public static class TemplateMessageRequest {
        private String templateName;
        private String languageCode;
        private Long senderId;
    }
}
