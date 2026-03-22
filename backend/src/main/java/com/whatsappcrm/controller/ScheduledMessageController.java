package com.whatsappcrm.controller;

import com.whatsappcrm.dto.ScheduledMessageRequest;
import com.whatsappcrm.dto.ScheduledMessageResponse;
import com.whatsappcrm.service.ScheduledMessageService;
import com.whatsappcrm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/scheduled-messages")
@RequiredArgsConstructor
public class ScheduledMessageController {

    private final ScheduledMessageService scheduledMessageService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<ScheduledMessageResponse>> getScheduledMessages(
            @PathVariable Long accountId) {
        return ResponseEntity.ok(scheduledMessageService.getScheduledMessages(accountId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScheduledMessageResponse> getScheduledMessage(
            @PathVariable Long accountId, @PathVariable Long id) {
        return ResponseEntity.ok(scheduledMessageService.getScheduledMessage(accountId, id));
    }

    @PostMapping
    public ResponseEntity<ScheduledMessageResponse> createScheduledMessage(
            @PathVariable Long accountId,
            @RequestBody ScheduledMessageRequest request,
            Authentication authentication) {
        Long userId = userService.getUserByEmail(authentication.getName()).getId();
        return ResponseEntity.ok(scheduledMessageService.createScheduledMessage(accountId, request, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScheduledMessageResponse> updateScheduledMessage(
            @PathVariable Long accountId, @PathVariable Long id,
            @RequestBody ScheduledMessageRequest request) {
        return ResponseEntity.ok(scheduledMessageService.updateScheduledMessage(accountId, id, request));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelScheduledMessage(
            @PathVariable Long accountId, @PathVariable Long id) {
        scheduledMessageService.cancelScheduledMessage(accountId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScheduledMessage(
            @PathVariable Long accountId, @PathVariable Long id) {
        scheduledMessageService.deleteScheduledMessage(accountId, id);
        return ResponseEntity.ok().build();
    }
}
