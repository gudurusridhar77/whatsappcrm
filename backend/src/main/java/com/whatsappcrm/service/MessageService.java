package com.whatsappcrm.service;

import com.whatsappcrm.dto.AttachmentResponse;
import com.whatsappcrm.dto.MessageResponse;
import com.whatsappcrm.dto.SendMessageRequest;
import com.whatsappcrm.entity.Attachment;
import com.whatsappcrm.entity.Conversation;
import com.whatsappcrm.entity.Message;
import com.whatsappcrm.enums.ChannelType;
import com.whatsappcrm.enums.MessageType;
import com.whatsappcrm.enums.SenderType;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.ContactRepository;
import com.whatsappcrm.repository.ConversationRepository;
import com.whatsappcrm.repository.MessageRepository;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final ContactRepository contactRepository;
    private final WebSocketEventService webSocketEventService;
    private final NotificationService notificationService;
    private final AutomationEngine automationEngine;
    private final AttachmentService attachmentService;
    private final WhatsAppChannelService whatsAppChannelService;
    private final EmailChannelService emailChannelService;

    public Page<MessageResponse> getMessages(Long accountId, Long conversationId, Pageable pageable,
                                              String baseUrl) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        Page<MessageResponse> messagePage = messageRepository
                .findByConversationIdOrderByCreatedAtAsc(conv.getId(), pageable)
                .map(this::toResponse);

        // Batch load attachments for all messages on this page
        List<Long> messageIds = messagePage.getContent().stream()
                .map(MessageResponse::getId)
                .collect(Collectors.toList());

        Map<Long, List<AttachmentResponse>> attachmentMap =
                attachmentService.getAttachmentsByMessageIds(messageIds, baseUrl);

        // Attach to each message response
        messagePage.getContent().forEach(msg ->
                msg.setAttachments(attachmentMap.getOrDefault(msg.getId(), Collections.emptyList()))
        );

        return messagePage;
    }

    // Backward compatible overload
    public Page<MessageResponse> getMessages(Long accountId, Long conversationId, Pageable pageable) {
        return getMessages(accountId, conversationId, pageable, "");
    }

    @Transactional
    public MessageResponse sendMessage(Long accountId, Long conversationId, Long currentUserId,
                                        SendMessageRequest request, MultipartFile[] files,
                                        String baseUrl) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        MessageType messageType = MessageType.OUTGOING;
        if (request.getMessageType() != null) {
            try {
                messageType = MessageType.valueOf(request.getMessageType().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid message type. Use: INCOMING, OUTGOING, ACTIVITY");
            }
        }

        // Allow empty content if files are attached
        String content = request.getContent();
        if ((content == null || content.isBlank()) && (files == null || files.length == 0)) {
            throw new BadRequestException("Message content or attachments required");
        }
        if (content == null) content = "";

        // Build content attributes for interactive messages
        Map<String, Object> contentAttributes = new java.util.HashMap<>();
        String contentType = request.getContentType() != null ? request.getContentType() : "text";
        contentAttributes.put("contentType", contentType);

        if (request.getInteractiveData() != null && !"text".equals(contentType)) {
            contentAttributes.put("interactiveData", request.getInteractiveData());
            // Use body text from interactive data as message content if content is empty
            if ((content == null || content.isEmpty()) && request.getInteractiveData().containsKey("body")) {
                content = String.valueOf(request.getInteractiveData().get("body"));
            }
        }

        Message message = Message.builder()
                .account(conv.getAccount())
                .conversation(conv)
                .inbox(conv.getInbox())
                .content(content)
                .messageType(messageType)
                .senderType(SenderType.USER)
                .senderId(currentUserId)
                .privateFlag(request.getPrivateFlag() != null ? request.getPrivateFlag() : false)
                .contentAttributes(contentAttributes)
                .build();

        message = messageRepository.save(message);

        // Save attachments
        List<Attachment> attachments = attachmentService.saveAttachments(message, conv.getAccount(), files);
        List<AttachmentResponse> attachmentResponses = attachments.stream()
                .map(a -> AttachmentResponse.fromAttachment(a, baseUrl))
                .collect(Collectors.toList());

        // Update conversation last activity and first reply
        conv.setLastActivityAt(LocalDateTime.now());
        if (conv.getFirstReplyAt() == null && messageType == MessageType.OUTGOING) {
            conv.setFirstReplyAt(LocalDateTime.now());
        }
        conversationRepository.save(conv);

        // Deliver via the conversation's channel (outgoing, non-private)
        if (messageType == MessageType.OUTGOING && !message.getPrivateFlag()) {
            ChannelType channelType = conv.getInbox().getChannelType();
            if (channelType == ChannelType.WHATSAPP) {
                try {
                    whatsAppChannelService.sendOutgoingWhatsAppMessage(
                            accountId, conversationId, message, attachments);
                } catch (Exception e) {
                    // Log but don't fail — message is saved locally
                    log.warn("Failed to deliver message via WhatsApp for conversation {}: {}", conversationId, e.getMessage());
                }
            } else if (channelType == ChannelType.EMAIL) {
                try {
                    emailChannelService.sendEmailReply(accountId, conversationId, content, currentUserId);
                } catch (Exception e) {
                    // Log but don't fail — message is saved locally
                    log.warn("Failed to deliver message via email for conversation {}: {}", conversationId, e.getMessage());
                }
            }
        }

        MessageResponse response = toResponse(message);
        response.setAttachments(attachmentResponses);
        webSocketEventService.broadcastNewMessage(accountId, conversationId, response);

        // Notify assignee about new message (if someone else sent it)
        if (conv.getAssignee() != null && !conv.getAssignee().getId().equals(currentUserId)) {
            String preview = content.length() > 80
                    ? content.substring(0, 80) + "..."
                    : content;
            if (preview.isEmpty() && !attachments.isEmpty()) {
                preview = "[Attachment: " + attachments.get(0).getFileName() + "]";
            }
            notificationService.notifyAssignee(accountId, conv.getAssignee().getId(), currentUserId,
                    "new_message",
                    "New message in #" + conv.getDisplayId(),
                    preview,
                    conv.getId(), Map.of("displayId", conv.getDisplayId(), "senderName", response.getSenderName() != null ? response.getSenderName() : "Agent"));
        }

        // Trigger automation rules
        automationEngine.onMessageCreated(message, conv);

        return response;
    }

    // Backward compatible overload (no files)
    @Transactional
    public MessageResponse sendMessage(Long accountId, Long conversationId, Long currentUserId,
                                        SendMessageRequest request) {
        return sendMessage(accountId, conversationId, currentUserId, request, null, "");
    }

    private MessageResponse toResponse(Message message) {
        String senderName = null;
        if (message.getSenderType() == SenderType.USER && message.getSenderId() != null) {
            senderName = userRepository.findById(message.getSenderId())
                    .map(u -> u.getName()).orElse("Unknown");
        } else if (message.getSenderType() == SenderType.CONTACT && message.getSenderId() != null) {
            senderName = contactRepository.findById(message.getSenderId())
                    .map(c -> c.getName()).orElse("Unknown");
        }
        return MessageResponse.fromMessage(message, senderName);
    }
}
