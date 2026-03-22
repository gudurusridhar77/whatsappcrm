package com.whatsappcrm.service;

import com.whatsappcrm.entity.*;
import com.whatsappcrm.entity.AutomationRule.RuleAction;
import com.whatsappcrm.entity.AutomationRule.RuleCondition;
import com.whatsappcrm.enums.ConversationStatus;
import com.whatsappcrm.enums.MessageType;
import com.whatsappcrm.enums.SenderType;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutomationEngine {

    private final AutomationRuleRepository automationRuleRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final LabelRepository labelRepository;
    private final ActivityLogService activityLogService;

    /**
     * Evaluate automation rules when a conversation is created
     */
    @Async
    @Transactional
    public void onConversationCreated(Conversation conversation) {
        List<AutomationRule> rules = automationRuleRepository
                .findByAccountIdAndEventNameAndActiveTrueOrderByCreatedAtAsc(
                        conversation.getAccount().getId(), "conversation_created");

        for (AutomationRule rule : rules) {
            if (evaluateConditions(rule.getConditions(), conversation, null)) {
                executeActions(rule.getActions(), conversation, rule);
                log.info("Automation rule '{}' executed for conversation #{}", rule.getName(), conversation.getDisplayId());
            }
        }
    }

    /**
     * Evaluate automation rules when a conversation is updated
     */
    @Async
    @Transactional
    public void onConversationUpdated(Conversation conversation) {
        List<AutomationRule> rules = automationRuleRepository
                .findByAccountIdAndEventNameAndActiveTrueOrderByCreatedAtAsc(
                        conversation.getAccount().getId(), "conversation_updated");

        for (AutomationRule rule : rules) {
            if (evaluateConditions(rule.getConditions(), conversation, null)) {
                executeActions(rule.getActions(), conversation, rule);
                log.info("Automation rule '{}' executed for conversation #{}", rule.getName(), conversation.getDisplayId());
            }
        }
    }

    /**
     * Evaluate automation rules when a message is created
     */
    @Async
    @Transactional
    public void onMessageCreated(Message message, Conversation conversation) {
        List<AutomationRule> rules = automationRuleRepository
                .findByAccountIdAndEventNameAndActiveTrueOrderByCreatedAtAsc(
                        conversation.getAccount().getId(), "message_created");

        for (AutomationRule rule : rules) {
            if (evaluateConditions(rule.getConditions(), conversation, message)) {
                executeActions(rule.getActions(), conversation, rule);
                log.info("Automation rule '{}' executed for message in conversation #{}", rule.getName(), conversation.getDisplayId());
            }
        }
    }

    private boolean evaluateConditions(List<RuleCondition> conditions, Conversation conv, Message msg) {
        if (conditions == null || conditions.isEmpty()) return true;

        for (RuleCondition cond : conditions) {
            String actualValue = getAttributeValue(cond.getAttribute(), conv, msg);
            if (!matchesCondition(actualValue, cond.getOperator(), cond.getValue())) {
                return false; // AND logic: all conditions must match
            }
        }
        return true;
    }

    private String getAttributeValue(String attribute, Conversation conv, Message msg) {
        switch (attribute) {
            case "status":
                return conv.getStatus() != null ? conv.getStatus().name().toLowerCase() : "";
            case "inbox_id":
                return conv.getInbox() != null ? conv.getInbox().getId().toString() : "";
            case "channel_type":
                return conv.getInbox() != null ? conv.getInbox().getChannelType().name().toLowerCase() : "";
            case "contact_email":
                return conv.getContact() != null && conv.getContact().getEmail() != null
                        ? conv.getContact().getEmail().toLowerCase() : "";
            case "contact_name":
                return conv.getContact() != null && conv.getContact().getName() != null
                        ? conv.getContact().getName().toLowerCase() : "";
            case "team_id":
                return conv.getTeam() != null ? conv.getTeam().getId().toString() : "";
            case "assignee_id":
                return conv.getAssignee() != null ? conv.getAssignee().getId().toString() : "";
            case "message_content":
                return msg != null && msg.getContent() != null ? msg.getContent().toLowerCase() : "";
            default:
                return "";
        }
    }

    private boolean matchesCondition(String actual, String operator, String expected) {
        if (actual == null) actual = "";
        String expectedLower = expected != null ? expected.toLowerCase() : "";

        switch (operator) {
            case "equals":
                return actual.equals(expectedLower);
            case "not_equals":
                return !actual.equals(expectedLower);
            case "contains":
                return actual.contains(expectedLower);
            case "not_contains":
                return !actual.contains(expectedLower);
            default:
                return false;
        }
    }

    private void executeActions(List<RuleAction> actions, Conversation conv, AutomationRule rule) {
        Long accountId = conv.getAccount().getId();

        for (RuleAction action : actions) {
            try {
                switch (action.getType()) {
                    case "assign_agent":
                        assignAgent(conv, Long.parseLong(action.getValue()));
                        activityLogService.log(accountId, "Conversation", conv.getId(),
                                "automation_assign_agent", null,
                                Map.of("ruleName", rule.getName(), "agentId", action.getValue()));
                        break;

                    case "assign_team":
                        assignTeam(conv, Long.parseLong(action.getValue()), accountId);
                        activityLogService.log(accountId, "Conversation", conv.getId(),
                                "automation_assign_team", null,
                                Map.of("ruleName", rule.getName(), "teamId", action.getValue()));
                        break;

                    case "add_label":
                        addLabel(conv, action.getValue(), accountId);
                        activityLogService.log(accountId, "Conversation", conv.getId(),
                                "automation_add_label", null,
                                Map.of("ruleName", rule.getName(), "label", action.getValue()));
                        break;

                    case "send_message":
                        sendAutoMessage(conv, action.getValue());
                        activityLogService.log(accountId, "Conversation", conv.getId(),
                                "automation_send_message", null,
                                Map.of("ruleName", rule.getName()));
                        break;

                    case "change_status":
                        changeStatus(conv, action.getValue());
                        activityLogService.log(accountId, "Conversation", conv.getId(),
                                "automation_change_status", null,
                                Map.of("ruleName", rule.getName(), "newStatus", action.getValue()));
                        break;

                    default:
                        log.warn("Unknown automation action type: {}", action.getType());
                }
            } catch (Exception e) {
                log.error("Failed to execute automation action '{}' for rule '{}': {}",
                        action.getType(), rule.getName(), e.getMessage());
            }
        }
    }

    private void assignAgent(Conversation conv, Long agentId) {
        userRepository.findById(agentId).ifPresent(agent -> {
            conv.setAssignee(agent);
            conv.setLastActivityAt(LocalDateTime.now());
            conversationRepository.save(conv);
        });
    }

    private void assignTeam(Conversation conv, Long teamId, Long accountId) {
        teamRepository.findByIdAndAccountId(teamId, accountId).ifPresent(team -> {
            conv.setTeam(team);
            conv.setLastActivityAt(LocalDateTime.now());
            conversationRepository.save(conv);
        });
    }

    private void addLabel(Conversation conv, String labelTitle, Long accountId) {
        labelRepository.findByAccountIdAndTitle(accountId, labelTitle).ifPresent(label -> {
            conv.getLabels().add(label);
            conversationRepository.save(conv);
        });
    }

    private void sendAutoMessage(Conversation conv, String content) {
        Message autoMsg = Message.builder()
                .account(conv.getAccount())
                .conversation(conv)
                .inbox(conv.getInbox())
                .content(content)
                .messageType(MessageType.OUTGOING)
                .senderType(SenderType.USER)
                .build();
        messageRepository.save(autoMsg);

        conv.setLastActivityAt(LocalDateTime.now());
        conversationRepository.save(conv);
    }

    private void changeStatus(Conversation conv, String status) {
        try {
            ConversationStatus newStatus = ConversationStatus.valueOf(status.toUpperCase());
            conv.setStatus(newStatus);
            conv.setLastActivityAt(LocalDateTime.now());
            conversationRepository.save(conv);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid status in automation action: {}", status);
        }
    }
}
