package com.whatsappcrm.controller;

import com.whatsappcrm.dto.ConversationResponse;
import com.whatsappcrm.dto.CreateConversationRequest;
import com.whatsappcrm.dto.UpdateConversationRequest;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.service.ConversationService;
import com.whatsappcrm.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<ConversationResponse>> getConversations(
            @PathVariable Long accountId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long inboxId,
            @RequestParam(required = false) Long labelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("lastActivityAt").descending());
        return ResponseEntity.ok(conversationService.getConversations(accountId, status, assigneeId, inboxId, labelId, pageable));
    }

    @GetMapping("/counts")
    public ResponseEntity<Map<String, Long>> getConversationCounts(@PathVariable Long accountId) {
        return ResponseEntity.ok(conversationService.getConversationCounts(accountId));
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationResponse> getConversation(
            @PathVariable Long accountId,
            @PathVariable Long conversationId) {
        return ResponseEntity.ok(conversationService.getConversation(accountId, conversationId));
    }

    @PostMapping
    public ResponseEntity<ConversationResponse> createConversation(
            @PathVariable Long accountId,
            @Valid @RequestBody CreateConversationRequest request,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(conversationService.createConversation(accountId, currentUserId, request));
    }

    @PatchMapping("/{conversationId}")
    public ResponseEntity<ConversationResponse> updateConversation(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestBody UpdateConversationRequest request) {
        return ResponseEntity.ok(conversationService.updateConversation(accountId, conversationId, request));
    }

    private Long getCurrentUserId(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName());
        return user.getId();
    }
}
