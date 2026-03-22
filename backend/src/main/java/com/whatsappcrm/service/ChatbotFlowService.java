package com.whatsappcrm.service;

import com.whatsappcrm.dto.ChatbotFlowRequest;
import com.whatsappcrm.dto.ChatbotFlowResponse;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.ChatbotFlow;
import com.whatsappcrm.entity.Inbox;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.ChatbotFlowRepository;
import com.whatsappcrm.repository.InboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatbotFlowService {

    private final ChatbotFlowRepository flowRepository;
    private final AccountRepository accountRepository;
    private final InboxRepository inboxRepository;

    private static final Set<String> VALID_TRIGGERS = Set.of("WELCOME", "KEYWORD", "CONVERSATION_CREATED");

    public List<ChatbotFlowResponse> getFlows(Long accountId) {
        return flowRepository.findByAccountIdOrderByPriorityAscCreatedAtDesc(accountId)
                .stream()
                .map(ChatbotFlowResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public ChatbotFlowResponse getFlow(Long accountId, Long flowId) {
        ChatbotFlow flow = flowRepository.findByIdAndAccountId(flowId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot flow not found"));
        return ChatbotFlowResponse.fromEntity(flow);
    }

    public ChatbotFlowResponse createFlow(Long accountId, ChatbotFlowRequest request) {
        validateRequest(request);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        Inbox inbox = null;
        if (request.getInboxId() != null) {
            inbox = inboxRepository.findByIdAndAccountId(request.getInboxId(), accountId)
                    .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));
        }

        ChatbotFlow flow = ChatbotFlow.builder()
                .account(account)
                .name(request.getName())
                .description(request.getDescription())
                .inbox(inbox)
                .triggerType(request.getTriggerType())
                .triggerKeywords(request.getTriggerKeywords())
                .flowData(request.getFlowData())
                .active(request.getActive() != null ? request.getActive() : false)
                .priority(request.getPriority() != null ? request.getPriority() : 100)
                .build();

        return ChatbotFlowResponse.fromEntity(flowRepository.save(flow));
    }

    public ChatbotFlowResponse updateFlow(Long accountId, Long flowId, ChatbotFlowRequest request) {
        ChatbotFlow flow = flowRepository.findByIdAndAccountId(flowId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot flow not found"));

        if (request.getName() != null) flow.setName(request.getName());
        if (request.getDescription() != null) flow.setDescription(request.getDescription());
        if (request.getTriggerType() != null) {
            if (!VALID_TRIGGERS.contains(request.getTriggerType())) {
                throw new BadRequestException("Invalid trigger type: " + request.getTriggerType());
            }
            flow.setTriggerType(request.getTriggerType());
        }
        if (request.getTriggerKeywords() != null) flow.setTriggerKeywords(request.getTriggerKeywords());
        if (request.getFlowData() != null) flow.setFlowData(request.getFlowData());
        if (request.getActive() != null) flow.setActive(request.getActive());
        if (request.getPriority() != null) flow.setPriority(request.getPriority());

        if (request.getInboxId() != null) {
            Inbox inbox = inboxRepository.findByIdAndAccountId(request.getInboxId(), accountId)
                    .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));
            flow.setInbox(inbox);
        }

        return ChatbotFlowResponse.fromEntity(flowRepository.save(flow));
    }

    public void deleteFlow(Long accountId, Long flowId) {
        ChatbotFlow flow = flowRepository.findByIdAndAccountId(flowId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot flow not found"));
        flowRepository.delete(flow);
    }

    public ChatbotFlowResponse toggleFlow(Long accountId, Long flowId) {
        ChatbotFlow flow = flowRepository.findByIdAndAccountId(flowId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot flow not found"));
        flow.setActive(!flow.getActive());
        return ChatbotFlowResponse.fromEntity(flowRepository.save(flow));
    }

    public ChatbotFlowResponse duplicateFlow(Long accountId, Long flowId) {
        ChatbotFlow original = flowRepository.findByIdAndAccountId(flowId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Chatbot flow not found"));

        ChatbotFlow copy = ChatbotFlow.builder()
                .account(original.getAccount())
                .name(original.getName() + " (Copy)")
                .description(original.getDescription())
                .inbox(original.getInbox())
                .triggerType(original.getTriggerType())
                .triggerKeywords(original.getTriggerKeywords())
                .flowData(original.getFlowData())
                .active(false)
                .priority(original.getPriority())
                .build();

        return ChatbotFlowResponse.fromEntity(flowRepository.save(copy));
    }

    private void validateRequest(ChatbotFlowRequest request) {
        if (!VALID_TRIGGERS.contains(request.getTriggerType())) {
            throw new BadRequestException("Invalid trigger type. Use: WELCOME, KEYWORD, CONVERSATION_CREATED");
        }
        if ("KEYWORD".equals(request.getTriggerType()) &&
            (request.getTriggerKeywords() == null || request.getTriggerKeywords().isBlank())) {
            throw new BadRequestException("Keywords are required for KEYWORD trigger type");
        }
    }
}
