package com.whatsappcrm.controller;

import com.whatsappcrm.dto.ChatbotFlowRequest;
import com.whatsappcrm.dto.ChatbotFlowResponse;
import com.whatsappcrm.service.ChatbotFlowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/chatbot_flows")
@RequiredArgsConstructor
public class ChatbotFlowController {

    private final ChatbotFlowService chatbotFlowService;

    @GetMapping
    public ResponseEntity<List<ChatbotFlowResponse>> getFlows(@PathVariable Long accountId) {
        return ResponseEntity.ok(chatbotFlowService.getFlows(accountId));
    }

    @GetMapping("/{flowId}")
    public ResponseEntity<ChatbotFlowResponse> getFlow(
            @PathVariable Long accountId,
            @PathVariable Long flowId) {
        return ResponseEntity.ok(chatbotFlowService.getFlow(accountId, flowId));
    }

    @PostMapping
    public ResponseEntity<ChatbotFlowResponse> createFlow(
            @PathVariable Long accountId,
            @Valid @RequestBody ChatbotFlowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatbotFlowService.createFlow(accountId, request));
    }

    @PatchMapping("/{flowId}")
    public ResponseEntity<ChatbotFlowResponse> updateFlow(
            @PathVariable Long accountId,
            @PathVariable Long flowId,
            @RequestBody ChatbotFlowRequest request) {
        return ResponseEntity.ok(chatbotFlowService.updateFlow(accountId, flowId, request));
    }

    @DeleteMapping("/{flowId}")
    public ResponseEntity<Map<String, String>> deleteFlow(
            @PathVariable Long accountId,
            @PathVariable Long flowId) {
        chatbotFlowService.deleteFlow(accountId, flowId);
        return ResponseEntity.ok(Map.of("message", "Chatbot flow deleted"));
    }

    @PostMapping("/{flowId}/toggle")
    public ResponseEntity<ChatbotFlowResponse> toggleFlow(
            @PathVariable Long accountId,
            @PathVariable Long flowId) {
        return ResponseEntity.ok(chatbotFlowService.toggleFlow(accountId, flowId));
    }

    @PostMapping("/{flowId}/duplicate")
    public ResponseEntity<ChatbotFlowResponse> duplicateFlow(
            @PathVariable Long accountId,
            @PathVariable Long flowId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatbotFlowService.duplicateFlow(accountId, flowId));
    }
}
