package com.whatsappcrm.controller;

import com.whatsappcrm.dto.AutomationRuleRequest;
import com.whatsappcrm.dto.AutomationRuleResponse;
import com.whatsappcrm.service.AutomationRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/automation_rules")
@RequiredArgsConstructor
public class AutomationRuleController {

    private final AutomationRuleService automationRuleService;

    @GetMapping
    public ResponseEntity<List<AutomationRuleResponse>> getRules(@PathVariable Long accountId) {
        return ResponseEntity.ok(automationRuleService.getRules(accountId));
    }

    @GetMapping("/{ruleId}")
    public ResponseEntity<AutomationRuleResponse> getRule(
            @PathVariable Long accountId, @PathVariable Long ruleId) {
        return ResponseEntity.ok(automationRuleService.getRule(accountId, ruleId));
    }

    @PostMapping
    public ResponseEntity<AutomationRuleResponse> createRule(
            @PathVariable Long accountId,
            @Valid @RequestBody AutomationRuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(automationRuleService.createRule(accountId, request));
    }

    @PatchMapping("/{ruleId}")
    public ResponseEntity<AutomationRuleResponse> updateRule(
            @PathVariable Long accountId,
            @PathVariable Long ruleId,
            @RequestBody AutomationRuleRequest request) {
        return ResponseEntity.ok(automationRuleService.updateRule(accountId, ruleId, request));
    }

    @DeleteMapping("/{ruleId}")
    public ResponseEntity<Void> deleteRule(
            @PathVariable Long accountId, @PathVariable Long ruleId) {
        automationRuleService.deleteRule(accountId, ruleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{ruleId}/toggle")
    public ResponseEntity<AutomationRuleResponse> toggleRule(
            @PathVariable Long accountId, @PathVariable Long ruleId) {
        return ResponseEntity.ok(automationRuleService.toggleRule(accountId, ruleId));
    }
}
