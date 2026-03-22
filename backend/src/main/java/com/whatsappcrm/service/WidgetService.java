package com.whatsappcrm.service;

import com.whatsappcrm.dto.WidgetDTO;
import com.whatsappcrm.entity.*;
import com.whatsappcrm.enums.ChannelType;
import com.whatsappcrm.enums.ConversationStatus;
import com.whatsappcrm.enums.MessageType;
import com.whatsappcrm.enums.SenderType;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WidgetService {

    private final InboxRepository inboxRepository;
    private final ChannelWebWidgetRepository channelWebWidgetRepository;
    private final ContactRepository contactRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AccountRepository accountRepository;
    private final WebSocketEventService webSocketEventService;
    private final AutomationEngine automationEngine;
    private final ChatbotEngine chatbotEngine;
    private final NotificationService notificationService;
    private final AccountUserRepository accountUserRepository;

    /**
     * Get widget configuration by inbox token (public)
     */
    public WidgetDTO.WidgetConfig getWidgetConfig(String inboxToken) {
        Inbox inbox = inboxRepository.findByToken(inboxToken)
                .orElseThrow(() -> new ResourceNotFoundException("Widget not found"));

        if (inbox.getChannelType() != ChannelType.WEB_WIDGET) {
            throw new BadRequestException("Not a web widget inbox");
        }

        ChannelWebWidget widget = null;
        if (inbox.getChannelId() != null) {
            widget = channelWebWidgetRepository.findById(Long.parseLong(inbox.getChannelId())).orElse(null);
        }

        return WidgetDTO.WidgetConfig.builder()
                .inboxName(inbox.getName())
                .welcomeTitle(widget != null ? widget.getWelcomeTitle() : "Hi there!")
                .welcomeTagline(widget != null ? widget.getWelcomeTagline() : "Ask us anything.")
                .widgetColor(widget != null ? widget.getWidgetColor() : "#1b72e8")
                .replyTime(widget != null ? widget.getReplyTime() : "in a few minutes")
                .preChatFormEnabled(widget != null && Boolean.TRUE.equals(widget.getPreChatFormEnabled()))
                .greetingEnabled(Boolean.TRUE.equals(inbox.getGreetingEnabled()))
                .greetingMessage(inbox.getGreetingMessage())
                .build();
    }

    /**
     * Start or resume a conversation from the widget
     */
    @Transactional
    public WidgetDTO.WidgetConversation startConversation(String inboxToken,
                                                           WidgetDTO.StartConversationRequest request,
                                                           String sessionToken) {
        Inbox inbox = inboxRepository.findByToken(inboxToken)
                .orElseThrow(() -> new ResourceNotFoundException("Widget not found"));

        Account account = inbox.getAccount();
        Long accountId = account.getId();

        // Find or create contact
        Contact contact;
        if (StringUtils.hasText(request.getEmail())) {
            contact = contactRepository.findByEmailAndAccountId(request.getEmail(), accountId)
                    .orElseGet(() -> {
                        Contact c = Contact.builder()
                                .account(account)
                                .name(StringUtils.hasText(request.getName()) ? request.getName() : "Visitor")
                                .email(request.getEmail())
                                .lastActivityAt(LocalDateTime.now())
                                .build();
                        return contactRepository.save(c);
                    });
            // Update name if provided and current is "Visitor"
            if (StringUtils.hasText(request.getName()) && "Visitor".equals(contact.getName())) {
                contact.setName(request.getName());
                contactRepository.save(contact);
            }
        } else {
            // Anonymous visitor — use session token to find existing contact
            String visitorName = StringUtils.hasText(request.getName()) ? request.getName() : "Visitor";
            String pseudoEmail = "widget-" + sessionToken + "@visitor.local";
            contact = contactRepository.findByEmailAndAccountId(pseudoEmail, accountId)
                    .orElseGet(() -> {
                        Contact c = Contact.builder()
                                .account(account)
                                .name(visitorName)
                                .email(pseudoEmail)
                                .lastActivityAt(LocalDateTime.now())
                                .build();
                        return contactRepository.save(c);
                    });
        }

        contact.setLastActivityAt(LocalDateTime.now());
        contactRepository.save(contact);

        // Find existing open conversation for this contact on this inbox, or create new
        Conversation conversation = conversationRepository
                .findByAccountIdAndContactIdAndInboxIdAndStatus(accountId, contact.getId(), inbox.getId())
                .orElse(null);

        if (conversation == null) {
            Long nextDisplayId = conversationRepository.findMaxDisplayIdByAccountId(accountId) + 1;

            conversation = Conversation.builder()
                    .account(account)
                    .inbox(inbox)
                    .contact(contact)
                    .displayId(nextDisplayId)
                    .status(ConversationStatus.OPEN)
                    .lastActivityAt(LocalDateTime.now())
                    .build();
            conversation = conversationRepository.save(conversation);

            // Send greeting message if enabled
            if (Boolean.TRUE.equals(inbox.getGreetingEnabled()) && StringUtils.hasText(inbox.getGreetingMessage())) {
                Message greeting = Message.builder()
                        .account(account)
                        .conversation(conversation)
                        .inbox(inbox)
                        .content(inbox.getGreetingMessage())
                        .messageType(MessageType.OUTGOING)
                        .senderType(SenderType.USER)
                        .build();
                messageRepository.save(greeting);
            }

            // Create the initial visitor message if provided
            if (StringUtils.hasText(request.getMessage())) {
                Message msg = Message.builder()
                        .account(account)
                        .conversation(conversation)
                        .inbox(inbox)
                        .content(request.getMessage())
                        .messageType(MessageType.INCOMING)
                        .senderType(SenderType.CONTACT)
                        .senderId(contact.getId())
                        .build();
                msg = messageRepository.save(msg);

                // Try chatbot first, then automation
                boolean handled = false;
                try { handled = chatbotEngine.processIncomingMessage(msg, conversation); } catch (Exception ignored) {}
                if (!handled) automationEngine.onMessageCreated(msg, conversation);
            }

            // Notify all agents
            notificationService.notifyAllAgents(accountId, null,
                    "new_conversation", "conversation",
                    "New conversation from " + contact.getName(),
                    "New conversation #" + conversation.getDisplayId() + " from the web widget",
                    "Conversation", conversation.getId(),
                    Map.of("contactName", contact.getName(), "inboxName", inbox.getName()));

            // Broadcast to agent dashboard
            webSocketEventService.broadcastConversationUpdate(accountId, Map.of(
                    "event", "conversation.created",
                    "conversationId", conversation.getId(),
                    "displayId", conversation.getDisplayId(),
                    "contactName", contact.getName()
            ));

            automationEngine.onConversationCreated(conversation);
        } else if (StringUtils.hasText(request.getMessage())) {
            // Existing conversation — just add the message
            Message msg = Message.builder()
                    .account(account)
                    .conversation(conversation)
                    .inbox(inbox)
                    .content(request.getMessage())
                    .messageType(MessageType.INCOMING)
                    .senderType(SenderType.CONTACT)
                    .senderId(contact.getId())
                    .build();
            msg = messageRepository.save(msg);

            conversation.setLastActivityAt(LocalDateTime.now());
            conversationRepository.save(conversation);

            // Try chatbot first, then automation
            boolean handled = false;
            try { handled = chatbotEngine.processIncomingMessage(msg, conversation); } catch (Exception ignored) {}
            if (!handled) automationEngine.onMessageCreated(msg, conversation);
        }

        // Store conversation token in additional_attributes for widget session
        String convToken = conversation.getAdditionalAttributes() != null
                ? (String) conversation.getAdditionalAttributes().get("widget_token")
                : null;
        if (convToken == null) {
            convToken = UUID.randomUUID().toString();
            if (conversation.getAdditionalAttributes() == null) {
                conversation.setAdditionalAttributes(new java.util.HashMap<>());
            }
            conversation.getAdditionalAttributes().put("widget_token", convToken);
            conversationRepository.save(conversation);
        }

        return WidgetDTO.WidgetConversation.builder()
                .id(conversation.getId())
                .token(convToken)
                .contactName(contact.getName())
                .status(conversation.getStatus().name())
                .build();
    }

    /**
     * Get messages for a widget conversation by conversation token
     */
    public List<WidgetDTO.WidgetMessage> getMessages(String conversationToken) {
        Conversation conv = findByWidgetToken(conversationToken);
        if (conv == null) return Collections.emptyList();

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId());

        return messages.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getPrivateFlag())) // Don't show private notes to visitors
                .map(m -> WidgetDTO.WidgetMessage.builder()
                        .id(m.getId())
                        .content(m.getContent())
                        .messageType(m.getMessageType().name())
                        .senderName(m.getSenderType() == SenderType.CONTACT ? "You" : "Agent")
                        .createdAt(m.getCreatedAt() != null ? m.getCreatedAt().toString() : null)
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Send a message from the widget visitor
     */
    @Transactional
    public WidgetDTO.WidgetMessage sendMessage(String conversationToken, WidgetDTO.WidgetMessageRequest request) {
        if (!StringUtils.hasText(request.getContent())) {
            throw new BadRequestException("Message content is required");
        }

        Conversation conv = findByWidgetToken(conversationToken);
        if (conv == null) {
            throw new ResourceNotFoundException("Conversation not found");
        }

        // Reopen if resolved
        if (conv.getStatus() == ConversationStatus.RESOLVED) {
            conv.setStatus(ConversationStatus.OPEN);
        }
        conv.setLastActivityAt(LocalDateTime.now());
        conversationRepository.save(conv);

        Message message = Message.builder()
                .account(conv.getAccount())
                .conversation(conv)
                .inbox(conv.getInbox())
                .content(request.getContent())
                .messageType(MessageType.INCOMING)
                .senderType(SenderType.CONTACT)
                .senderId(conv.getContact().getId())
                .build();

        message = messageRepository.save(message);

        WidgetDTO.WidgetMessage widgetMsg = WidgetDTO.WidgetMessage.builder()
                .id(message.getId())
                .content(message.getContent())
                .messageType("INCOMING")
                .senderName("You")
                .createdAt(message.getCreatedAt() != null ? message.getCreatedAt().toString() : null)
                .build();

        // Broadcast to agents via WebSocket
        Long accountId = conv.getAccount().getId();
        webSocketEventService.broadcastNewMessage(accountId, conv.getId(), Map.of(
                "id", message.getId(),
                "content", message.getContent(),
                "messageType", "INCOMING",
                "senderType", "CONTACT",
                "senderId", conv.getContact().getId(),
                "senderName", conv.getContact().getName(),
                "privateFlag", false,
                "createdAt", message.getCreatedAt() != null ? message.getCreatedAt().toString() : ""
        ));

        // Broadcast to widget subscriber
        webSocketEventService.broadcastWidgetMessage(conv.getId(), widgetMsg);

        // Notify assignee
        if (conv.getAssignee() != null) {
            String preview = request.getContent().length() > 80
                    ? request.getContent().substring(0, 80) + "..."
                    : request.getContent();
            notificationService.notifyAssignee(accountId, conv.getAssignee().getId(), null,
                    "new_message",
                    "New message in #" + conv.getDisplayId(),
                    preview, conv.getId(),
                    Map.of("displayId", conv.getDisplayId(), "senderName", conv.getContact().getName()));
        }

        // Try chatbot first, then automation
        boolean handled = false;
        try { handled = chatbotEngine.processIncomingMessage(message, conv); } catch (Exception ignored) {}
        if (!handled) automationEngine.onMessageCreated(message, conv);

        return widgetMsg;
    }

    private Conversation findByWidgetToken(String widgetToken) {
        return conversationRepository.findByWidgetToken(widgetToken).orElse(null);
    }
}
