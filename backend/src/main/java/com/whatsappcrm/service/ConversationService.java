package com.whatsappcrm.service;

import com.whatsappcrm.dto.*;
import com.whatsappcrm.entity.*;
import com.whatsappcrm.enums.ConversationStatus;
import com.whatsappcrm.enums.MessageType;
import com.whatsappcrm.enums.SenderType;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AccountRepository accountRepository;
    private final InboxRepository inboxRepository;
    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final WebSocketEventService webSocketEventService;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;
    private final AutomationEngine automationEngine;

    public Page<ConversationResponse> getConversations(Long accountId, String status, Long assigneeId,
                                                        Long inboxId, Long labelId, Pageable pageable) {
        Page<Conversation> conversations;

        if (labelId != null) {
            conversations = conversationRepository.findByAccountIdAndLabelId(accountId, labelId, pageable);
        } else if (StringUtils.hasText(status)) {
            ConversationStatus convStatus;
            try {
                convStatus = ConversationStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status");
            }
            conversations = conversationRepository.findByAccountIdAndStatus(accountId, convStatus, pageable);
        } else if (assigneeId != null) {
            conversations = conversationRepository.findByAccountIdAndAssigneeId(accountId, assigneeId, pageable);
        } else if (inboxId != null) {
            conversations = conversationRepository.findByAccountIdAndInboxId(accountId, inboxId, pageable);
        } else {
            conversations = conversationRepository.findByAccountId(accountId, pageable);
        }

        return conversations.map(this::toResponse);
    }

    public ConversationResponse getConversation(Long accountId, Long conversationId) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        return toResponse(conv);
    }

    /** Mark a conversation as read (clear its unread count) and broadcast the change. */
    @Transactional
    public ConversationResponse markRead(Long accountId, Long conversationId) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        if (conv.getUnreadCount() == null || conv.getUnreadCount() != 0) {
            conv.setUnreadCount(0);
            conv = conversationRepository.save(conv);
            ConversationResponse response = toResponse(conv);
            webSocketEventService.broadcastConversationUpdate(accountId, response);
            return response;
        }
        return toResponse(conv);
    }

    public Map<String, Long> getConversationCounts(Long accountId) {
        return Map.of(
                "open", conversationRepository.countByAccountIdAndStatus(accountId, ConversationStatus.OPEN),
                "pending", conversationRepository.countByAccountIdAndStatus(accountId, ConversationStatus.PENDING),
                "resolved", conversationRepository.countByAccountIdAndStatus(accountId, ConversationStatus.RESOLVED),
                "snoozed", conversationRepository.countByAccountIdAndStatus(accountId, ConversationStatus.SNOOZED)
        );
    }

    @Transactional
    public ConversationResponse createConversation(Long accountId, Long currentUserId,
                                                    CreateConversationRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        Contact contact = contactRepository.findByIdAndAccountId(request.getContactId(), accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
        Inbox inbox = inboxRepository.findByIdAndAccountId(request.getInboxId(), accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));
        }

        Long nextDisplayId = conversationRepository.findMaxDisplayIdByAccountId(accountId) + 1;

        Conversation conversation = Conversation.builder()
                .account(account)
                .inbox(inbox)
                .contact(contact)
                .assignee(assignee)
                .displayId(nextDisplayId)
                .status(ConversationStatus.OPEN)
                .subject(request.getSubject())
                .lastActivityAt(LocalDateTime.now())
                .build();

        conversation = conversationRepository.save(conversation);

        // Create initial message if provided
        if (StringUtils.hasText(request.getInitialMessage())) {
            Message message = Message.builder()
                    .account(account)
                    .conversation(conversation)
                    .inbox(inbox)
                    .content(request.getInitialMessage())
                    .messageType(MessageType.OUTGOING)
                    .senderType(SenderType.USER)
                    .senderId(currentUserId)
                    .build();
            messageRepository.save(message);
        }

        ConversationResponse response = toResponse(conversation);
        webSocketEventService.broadcastConversationUpdate(accountId, response);

        activityLogService.log(accountId, "Conversation", conversation.getId(),
                "conversation_created", currentUserId,
                Map.of("contactName", contact.getName(), "inboxName", inbox.getName()));

        // Notify assignee if assigned
        if (assignee != null) {
            notificationService.notifyAssignee(accountId, assignee.getId(), currentUserId,
                    "conversation_assignment",
                    "New conversation assigned",
                    "Conversation #" + conversation.getDisplayId() + " with " + contact.getName() + " has been assigned to you",
                    conversation.getId(), Map.of("contactName", contact.getName()));
        }

        // Trigger automation rules
        automationEngine.onConversationCreated(conversation);

        return response;
    }

    @Transactional
    public ConversationResponse updateConversation(Long accountId, Long conversationId,
                                                    UpdateConversationRequest request) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (StringUtils.hasText(request.getStatus())) {
            try {
                ConversationStatus newStatus = ConversationStatus.valueOf(request.getStatus().toUpperCase());
                conv.setStatus(newStatus);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status. Use: OPEN, RESOLVED, PENDING, SNOOZED");
            }
        }

        if (request.getAssigneeId() != null) {
            if (request.getAssigneeId() == 0) {
                conv.setAssignee(null); // unassign
            } else {
                User assignee = userRepository.findById(request.getAssigneeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));
                conv.setAssignee(assignee);
            }
        }

        if (request.getTeamId() != null) {
            if (request.getTeamId() == 0) {
                conv.setTeam(null); // unassign team
            } else {
                Team team = teamRepository.findByIdAndAccountId(request.getTeamId(), accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
                conv.setTeam(team);
            }
        }

        if (request.getSubject() != null) {
            conv.setSubject(request.getSubject());
        }

        conv.setLastActivityAt(LocalDateTime.now());
        conv = conversationRepository.save(conv);
        ConversationResponse response = toResponse(conv);
        webSocketEventService.broadcastConversationUpdate(accountId, response);
        if (StringUtils.hasText(request.getStatus())) {
            webSocketEventService.broadcastStatusChange(accountId, conversationId, request.getStatus().toUpperCase());
            activityLogService.log(accountId, "Conversation", conversationId,
                    "status_changed", null, Map.of("newStatus", request.getStatus().toUpperCase()));
        }
        if (request.getAssigneeId() != null) {
            String assigneeName = request.getAssigneeId() == 0 ? "Unassigned"
                    : (conv.getAssignee() != null ? conv.getAssignee().getName() : "Unknown");
            activityLogService.log(accountId, "Conversation", conversationId,
                    "assignee_changed", null, Map.of("assigneeName", assigneeName));
            // Notify the new assignee
            if (request.getAssigneeId() != 0 && conv.getAssignee() != null) {
                notificationService.notifyAssignee(accountId, conv.getAssignee().getId(), null,
                        "conversation_assignment",
                        "Conversation assigned to you",
                        "Conversation #" + conv.getDisplayId() + " has been assigned to you",
                        conversationId, Map.of("displayId", conv.getDisplayId()));
            }
        }
        if (request.getTeamId() != null) {
            String teamName = request.getTeamId() == 0 ? "No Team"
                    : (conv.getTeam() != null ? conv.getTeam().getName() : "Unknown");
            activityLogService.log(accountId, "Conversation", conversationId,
                    "team_changed", null, Map.of("teamName", teamName));
        }

        // Trigger automation rules
        automationEngine.onConversationUpdated(conv);

        return response;
    }

    private ConversationResponse toResponse(Conversation conv) {
        long msgCount = messageRepository.countByConversationId(conv.getId());
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId());
        String lastMsg = messages.isEmpty() ? null : messages.get(messages.size() - 1).getContent();
        if (lastMsg != null && lastMsg.length() > 100) {
            lastMsg = lastMsg.substring(0, 100) + "...";
        }
        return ConversationResponse.fromConversation(conv, msgCount, lastMsg);
    }
}
