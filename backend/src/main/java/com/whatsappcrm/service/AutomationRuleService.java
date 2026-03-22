package com.whatsappcrm.service;

import com.whatsappcrm.dto.AutomationRuleRequest;
import com.whatsappcrm.dto.AutomationRuleResponse;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.AutomationRule;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.AutomationRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AutomationRuleService {

    private final AutomationRuleRepository automationRuleRepository;
    private final AccountRepository accountRepository;

    private static final Set<String> VALID_EVENTS = Set.of(
            "conversation_created", "conversation_updated", "message_created"
    );

    private static final Set<String> VALID_ATTRIBUTES = Set.of(
            "status", "inbox_id", "message_content", "contact_email",
            "contact_name", "team_id", "assignee_id", "channel_type"
    );

    private static final Set<String> VALID_OPERATORS = Set.of(
            "equals", "not_equals", "contains", "not_contains"
    );

    private static final Set<String> VALID_ACTION_TYPES = Set.of(
            "assign_agent", "assign_team", "add_label", "send_message", "change_status"
    );

    public List<AutomationRuleResponse> getRules(Long accountId) {
        return automationRuleRepository.findByAccountIdOrderByCreatedAtDesc(accountId).stream()
                .map(AutomationRuleResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public AutomationRuleResponse getRule(Long accountId, Long ruleId) {
        AutomationRule rule = automationRuleRepository.findByIdAndAccountId(ruleId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Automation rule not found"));
        return AutomationRuleResponse.fromEntity(rule);
    }

    @Transactional
    public AutomationRuleResponse createRule(Long accountId, AutomationRuleRequest request) {
        validateRule(request);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        AutomationRule rule = AutomationRule.builder()
                .account(account)
                .name(request.getName())
                .description(request.getDescription())
                .eventName(request.getEventName())
                .active(request.getActive() != null ? request.getActive() : true)
                .conditions(request.getConditions())
                .actions(request.getActions())
                .build();

        rule = automationRuleRepository.save(rule);
        return AutomationRuleResponse.fromEntity(rule);
    }

    @Transactional
    public AutomationRuleResponse updateRule(Long accountId, Long ruleId, AutomationRuleRequest request) {
        AutomationRule rule = automationRuleRepository.findByIdAndAccountId(ruleId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Automation rule not found"));

        if (request.getName() != null) rule.setName(request.getName());
        if (request.getDescription() != null) rule.setDescription(request.getDescription());
        if (request.getEventName() != null) {
            if (!VALID_EVENTS.contains(request.getEventName())) {
                throw new BadRequestException("Invalid event: " + request.getEventName());
            }
            rule.setEventName(request.getEventName());
        }
        if (request.getActive() != null) rule.setActive(request.getActive());
        if (request.getConditions() != null) rule.setConditions(request.getConditions());
        if (request.getActions() != null) rule.setActions(request.getActions());

        rule = automationRuleRepository.save(rule);
        return AutomationRuleResponse.fromEntity(rule);
    }

    @Transactional
    public void deleteRule(Long accountId, Long ruleId) {
        AutomationRule rule = automationRuleRepository.findByIdAndAccountId(ruleId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Automation rule not found"));
        automationRuleRepository.delete(rule);
    }

    @Transactional
    public AutomationRuleResponse toggleRule(Long accountId, Long ruleId) {
        AutomationRule rule = automationRuleRepository.findByIdAndAccountId(ruleId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Automation rule not found"));
        rule.setActive(!rule.getActive());
        rule = automationRuleRepository.save(rule);
        return AutomationRuleResponse.fromEntity(rule);
    }

    private void validateRule(AutomationRuleRequest request) {
        if (!VALID_EVENTS.contains(request.getEventName())) {
            throw new BadRequestException("Invalid event. Use: " + VALID_EVENTS);
        }
        for (var cond : request.getConditions()) {
            if (!VALID_ATTRIBUTES.contains(cond.getAttribute())) {
                throw new BadRequestException("Invalid condition attribute: " + cond.getAttribute() + ". Use: " + VALID_ATTRIBUTES);
            }
            if (!VALID_OPERATORS.contains(cond.getOperator())) {
                throw new BadRequestException("Invalid operator: " + cond.getOperator() + ". Use: " + VALID_OPERATORS);
            }
        }
        for (var action : request.getActions()) {
            if (!VALID_ACTION_TYPES.contains(action.getType())) {
                throw new BadRequestException("Invalid action type: " + action.getType() + ". Use: " + VALID_ACTION_TYPES);
            }
        }
    }
}
