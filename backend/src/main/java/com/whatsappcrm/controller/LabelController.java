package com.whatsappcrm.controller;

import com.whatsappcrm.dto.CreateLabelRequest;
import com.whatsappcrm.dto.LabelResponse;
import com.whatsappcrm.dto.UpdateLabelRequest;
import com.whatsappcrm.service.LabelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}")
@RequiredArgsConstructor
public class LabelController {

    private final LabelService labelService;

    // ===== Label CRUD =====

    @GetMapping("/labels")
    public ResponseEntity<List<LabelResponse>> getLabels(@PathVariable Long accountId) {
        return ResponseEntity.ok(labelService.getLabels(accountId));
    }

    @GetMapping("/labels/{labelId}")
    public ResponseEntity<LabelResponse> getLabel(
            @PathVariable Long accountId,
            @PathVariable Long labelId) {
        return ResponseEntity.ok(labelService.getLabel(accountId, labelId));
    }

    @PostMapping("/labels")
    public ResponseEntity<LabelResponse> createLabel(
            @PathVariable Long accountId,
            @Valid @RequestBody CreateLabelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(labelService.createLabel(accountId, request));
    }

    @PatchMapping("/labels/{labelId}")
    public ResponseEntity<LabelResponse> updateLabel(
            @PathVariable Long accountId,
            @PathVariable Long labelId,
            @Valid @RequestBody UpdateLabelRequest request) {
        return ResponseEntity.ok(labelService.updateLabel(accountId, labelId, request));
    }

    @DeleteMapping("/labels/{labelId}")
    public ResponseEntity<Void> deleteLabel(
            @PathVariable Long accountId,
            @PathVariable Long labelId) {
        labelService.deleteLabel(accountId, labelId);
        return ResponseEntity.noContent().build();
    }

    // ===== Conversation Labels =====

    @GetMapping("/conversations/{conversationId}/labels")
    public ResponseEntity<List<LabelResponse>> getConversationLabels(
            @PathVariable Long accountId,
            @PathVariable Long conversationId) {
        return ResponseEntity.ok(labelService.getConversationLabels(accountId, conversationId));
    }

    @PostMapping("/conversations/{conversationId}/labels")
    public ResponseEntity<List<LabelResponse>> setConversationLabels(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestBody Map<String, Set<Long>> body) {
        Set<Long> labelIds = body.getOrDefault("labelIds", Set.of());
        return ResponseEntity.ok(labelService.setConversationLabels(accountId, conversationId, labelIds));
    }
}
