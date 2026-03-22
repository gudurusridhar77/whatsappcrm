package com.whatsappcrm.controller;

import com.whatsappcrm.dto.SendTemplateRequest;
import com.whatsappcrm.dto.WhatsAppTemplateRequest;
import com.whatsappcrm.dto.WhatsAppTemplateResponse;
import com.whatsappcrm.service.WhatsAppTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}")
@RequiredArgsConstructor
public class WhatsAppTemplateController {

    private final WhatsAppTemplateService templateService;

    /**
     * List all templates (optionally filter by inboxId)
     */
    @GetMapping("/whatsapp_templates")
    public ResponseEntity<List<WhatsAppTemplateResponse>> getTemplates(
            @PathVariable Long accountId,
            @RequestParam(required = false) Long inboxId) {
        return ResponseEntity.ok(templateService.getTemplates(accountId, inboxId));
    }

    /**
     * Get a single template
     */
    @GetMapping("/whatsapp_templates/{templateId}")
    public ResponseEntity<WhatsAppTemplateResponse> getTemplate(
            @PathVariable Long accountId,
            @PathVariable Long templateId) {
        return ResponseEntity.ok(templateService.getTemplate(accountId, templateId));
    }

    /**
     * Create a new template (submits to Meta for approval)
     */
    @PostMapping("/whatsapp_templates")
    public ResponseEntity<WhatsAppTemplateResponse> createTemplate(
            @PathVariable Long accountId,
            @Valid @RequestBody WhatsAppTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateService.createTemplate(accountId, request));
    }

    /**
     * Update a template
     */
    @PatchMapping("/whatsapp_templates/{templateId}")
    public ResponseEntity<WhatsAppTemplateResponse> updateTemplate(
            @PathVariable Long accountId,
            @PathVariable Long templateId,
            @RequestBody WhatsAppTemplateRequest request) {
        return ResponseEntity.ok(templateService.updateTemplate(accountId, templateId, request));
    }

    /**
     * Delete a template
     */
    @DeleteMapping("/whatsapp_templates/{templateId}")
    public ResponseEntity<Map<String, String>> deleteTemplate(
            @PathVariable Long accountId,
            @PathVariable Long templateId) {
        templateService.deleteTemplate(accountId, templateId);
        return ResponseEntity.ok(Map.of("message", "Template deleted"));
    }

    /**
     * Sync templates from Meta API
     */
    @PostMapping("/inboxes/{inboxId}/sync_templates")
    public ResponseEntity<List<WhatsAppTemplateResponse>> syncTemplates(
            @PathVariable Long accountId,
            @PathVariable Long inboxId) {
        return ResponseEntity.ok(templateService.syncTemplates(accountId, inboxId));
    }

    /**
     * Send a template message in a conversation
     */
    @PostMapping("/conversations/{conversationId}/send_template")
    public ResponseEntity<Map<String, String>> sendTemplate(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @Valid @RequestBody SendTemplateRequest request) {
        templateService.sendTemplate(accountId, conversationId, request);
        return ResponseEntity.ok(Map.of("status", "sent"));
    }
}
