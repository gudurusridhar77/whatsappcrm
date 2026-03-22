package com.whatsappcrm.controller;

import com.whatsappcrm.entity.Conversation;
import com.whatsappcrm.service.EmailChannelService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class EmailChannelController {

    private final EmailChannelService emailChannelService;

    /**
     * Send email reply from a conversation
     */
    @PostMapping("/api/v1/accounts/{accountId}/conversations/{conversationId}/email_reply")
    public ResponseEntity<Map<String, String>> sendEmailReply(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        Long senderId = body.get("senderId") != null ? Long.parseLong(body.get("senderId")) : null;
        emailChannelService.sendEmailReply(accountId, conversationId, content, senderId);
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    /**
     * Test SMTP connection for an email inbox
     */
    @PostMapping("/api/v1/accounts/{accountId}/inboxes/{inboxId}/test_smtp")
    public ResponseEntity<Map<String, Object>> testSmtp(
            @PathVariable Long accountId,
            @PathVariable Long inboxId) {
        boolean success = emailChannelService.testSmtpConnection(accountId, inboxId);
        return ResponseEntity.ok(Map.of("success", success));
    }

    /**
     * Webhook endpoint to receive incoming emails
     * This can be called by email forwarding services (SendGrid, Mailgun, etc.)
     */
    @PostMapping("/public/email/incoming/{inboxToken}")
    public ResponseEntity<Map<String, Object>> receiveEmail(
            @PathVariable String inboxToken,
            @RequestBody IncomingEmailRequest request) {
        // Note: In production, validate the inboxToken against inbox.token
        Conversation conv = emailChannelService.processIncomingEmail(
                request.getInboxId(),
                request.getFromEmail(),
                request.getFromName(),
                request.getSubject(),
                request.getBody());
        return ResponseEntity.ok(Map.of(
                "status", "received",
                "conversationId", conv.getId(),
                "displayId", conv.getDisplayId()));
    }

    @Data
    public static class IncomingEmailRequest {
        private Long inboxId;
        private String fromEmail;
        private String fromName;
        private String subject;
        private String body;
    }
}
