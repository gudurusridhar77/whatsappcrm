package com.whatsappcrm.controller;

import com.whatsappcrm.dto.CreateInboxRequest;
import com.whatsappcrm.dto.InboxResponse;
import com.whatsappcrm.dto.UpdateInboxRequest;
import com.whatsappcrm.service.InboxService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/inboxes")
@RequiredArgsConstructor
public class InboxController {

    private final InboxService inboxService;

    @GetMapping
    public ResponseEntity<List<InboxResponse>> getInboxes(@PathVariable Long accountId) {
        return ResponseEntity.ok(inboxService.getInboxes(accountId));
    }

    @GetMapping("/{inboxId}")
    public ResponseEntity<InboxResponse> getInbox(
            @PathVariable Long accountId,
            @PathVariable Long inboxId) {
        return ResponseEntity.ok(inboxService.getInbox(accountId, inboxId));
    }

    @PostMapping
    public ResponseEntity<InboxResponse> createInbox(
            @PathVariable Long accountId,
            @Valid @RequestBody CreateInboxRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inboxService.createInbox(accountId, request));
    }

    @PatchMapping("/{inboxId}")
    public ResponseEntity<InboxResponse> updateInbox(
            @PathVariable Long accountId,
            @PathVariable Long inboxId,
            @RequestBody UpdateInboxRequest request) {
        return ResponseEntity.ok(inboxService.updateInbox(accountId, inboxId, request));
    }

    @DeleteMapping("/{inboxId}")
    public ResponseEntity<Map<String, String>> deleteInbox(
            @PathVariable Long accountId,
            @PathVariable Long inboxId) {
        inboxService.deleteInbox(accountId, inboxId);
        return ResponseEntity.ok(Map.of("message", "Inbox deleted"));
    }
}
