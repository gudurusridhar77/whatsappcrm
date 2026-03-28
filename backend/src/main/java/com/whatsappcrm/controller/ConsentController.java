package com.whatsappcrm.controller;

import com.whatsappcrm.dto.ConsentResponse;
import com.whatsappcrm.dto.ConsentUpdateRequest;
import com.whatsappcrm.service.ConsentService;
import com.whatsappcrm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/consent")
@RequiredArgsConstructor
public class ConsentController {

    private final ConsentService consentService;
    private final UserService userService;

    /**
     * Get all consent records, optionally filtered by status
     */
    @GetMapping
    public ResponseEntity<List<ConsentResponse>> getConsents(
            @PathVariable Long accountId,
            @RequestParam(required = false) String status) {
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(consentService.getConsentsByStatus(accountId, status));
        }
        return ResponseEntity.ok(consentService.getAllConsents(accountId));
    }

    /**
     * Get consent detail with full audit trail for a specific contact
     */
    @GetMapping("/contacts/{contactId}")
    public ResponseEntity<ConsentResponse.ConsentDetailResponse> getConsentDetail(
            @PathVariable Long accountId, @PathVariable Long contactId) {
        return ResponseEntity.ok(consentService.getConsentDetail(accountId, contactId));
    }

    /**
     * Manually update a contact's consent status
     */
    @PutMapping("/contacts/{contactId}")
    public ResponseEntity<ConsentResponse> updateConsent(
            @PathVariable Long accountId, @PathVariable Long contactId,
            @RequestBody ConsentUpdateRequest request,
            Authentication authentication) {
        Long userId = userService.getUserByEmail(authentication.getName()).getId();
        return ResponseEntity.ok(consentService.updateConsent(accountId, contactId, request, userId));
    }

    /**
     * Get consent statistics (opt-in rate, counts)
     */
    @GetMapping("/stats")
    public ResponseEntity<ConsentResponse.ConsentStats> getStats(@PathVariable Long accountId) {
        return ResponseEntity.ok(consentService.getStats(accountId));
    }

    /**
     * Bulk opt-out contacts
     */
    @PostMapping("/bulk-opt-out")
    public ResponseEntity<Map<String, Object>> bulkOptOut(
            @PathVariable Long accountId,
            @RequestBody Map<String, Object> request,
            Authentication authentication) {
        Long userId = userService.getUserByEmail(authentication.getName()).getId();

        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) request.get("contactIds");
        List<Long> contactIds = ids.stream().map(Integer::longValue).toList();
        String notes = (String) request.getOrDefault("notes", "Bulk opt-out");

        int count = consentService.bulkOptOut(accountId, contactIds, notes, userId);
        return ResponseEntity.ok(Map.of("optedOutCount", count));
    }

    /**
     * Check if a contact can receive messages
     */
    @GetMapping("/contacts/{contactId}/can-send")
    public ResponseEntity<Map<String, Boolean>> canSend(
            @PathVariable Long accountId, @PathVariable Long contactId) {
        boolean canSend = consentService.canSendMessage(accountId, contactId);
        return ResponseEntity.ok(Map.of("canSend", canSend));
    }
}
