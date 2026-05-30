package com.whatsappcrm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.whatsappcrm.dto.AttachmentResponse;
import com.whatsappcrm.entity.*;
import com.whatsappcrm.enums.ChannelType;
import com.whatsappcrm.enums.MessageType;
import com.whatsappcrm.enums.SenderType;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppChannelService {

    private final InboxRepository inboxRepository;
    private final ChannelWhatsappRepository channelWhatsappRepository;
    private final ConversationRepository conversationRepository;
    private final ContactRepository contactRepository;
    private final MessageRepository messageRepository;
    private final AccountRepository accountRepository;
    private final WebSocketEventService webSocketEventService;
    private final NotificationService notificationService;
    private final AutomationEngine automationEngine;
    private final BroadcastService broadcastService;
    private final AttachmentService attachmentService;
    private final ChatbotEngine chatbotEngine;
    private final FileStorageService fileStorageService;
    private final ConsentService consentService;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    // Media types that WhatsApp supports for download
    private static final Set<String> MEDIA_TYPES = Set.of("image", "video", "audio", "document", "sticker");

    /**
     * Send a WhatsApp text message via Meta Cloud API
     */
    public void sendWhatsAppMessage(Long accountId, Long conversationId, String content, Long senderId) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        Inbox inbox = conv.getInbox();
        if (inbox.getChannelType() != ChannelType.WHATSAPP) {
            throw new BadRequestException("Conversation inbox is not a WhatsApp channel");
        }

        ChannelWhatsapp waConfig = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId()))
                .orElseThrow(() -> new ResourceNotFoundException("WhatsApp channel config not found"));

        Contact contact = conv.getContact();
        if (contact.getPhoneNumber() == null || contact.getPhoneNumber().isEmpty()) {
            throw new BadRequestException("Contact does not have a phone number");
        }

        try {
            String url = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(waConfig.getAccessToken());

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", contact.getPhoneNumber());
            body.put("type", "text");
            body.put("text", Map.of("body", content));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("WhatsApp message sent to {} for conversation #{}", contact.getPhoneNumber(), conv.getDisplayId());

                // Parse response for message ID
                JsonNode responseJson = objectMapper.readTree(response.getBody());
                String waMessageId = null;
                if (responseJson.has("messages") && responseJson.get("messages").isArray()) {
                    waMessageId = responseJson.get("messages").get(0).get("id").asText();
                }

                // Save outgoing message
                Message message = Message.builder()
                        .account(conv.getAccount())
                        .conversation(conv)
                        .inbox(inbox)
                        .content(content)
                        .messageType(MessageType.OUTGOING)
                        .senderType(SenderType.USER)
                        .senderId(senderId)
                        .externalId(waMessageId)
                        .build();
                messageRepository.save(message);

                conv.setLastActivityAt(LocalDateTime.now());
                if (conv.getFirstReplyAt() == null) {
                    conv.setFirstReplyAt(LocalDateTime.now());
                }
                conversationRepository.save(conv);

            } else {
                throw new BadRequestException("WhatsApp API returned: " + response.getStatusCode());
            }

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message for conversation #{}: {}", conv.getDisplayId(), e.getMessage());
            throw new BadRequestException("Failed to send WhatsApp message: " + e.getMessage());
        }
    }

    /**
     * Send a WhatsApp template message (for initiating conversations outside 24h window)
     */
    public void sendTemplateMessage(Long accountId, Long conversationId, String templateName,
                                     String languageCode, Long senderId) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        Inbox inbox = conv.getInbox();
        ChannelWhatsapp waConfig = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId()))
                .orElseThrow(() -> new ResourceNotFoundException("WhatsApp channel config not found"));

        Contact contact = conv.getContact();
        if (contact.getPhoneNumber() == null || contact.getPhoneNumber().isEmpty()) {
            throw new BadRequestException("Contact does not have a phone number");
        }

        try {
            String url = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(waConfig.getAccessToken());

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("to", contact.getPhoneNumber());
            body.put("type", "template");
            body.put("template", Map.of(
                    "name", templateName,
                    "language", Map.of("code", languageCode != null ? languageCode : "en_US")
            ));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("WhatsApp template '{}' sent to {} for conversation #{}",
                        templateName, contact.getPhoneNumber(), conv.getDisplayId());

                Message message = Message.builder()
                        .account(conv.getAccount())
                        .conversation(conv)
                        .inbox(inbox)
                        .content("[Template: " + templateName + "]")
                        .messageType(MessageType.OUTGOING)
                        .senderType(SenderType.USER)
                        .senderId(senderId)
                        .build();
                messageRepository.save(message);
            }

        } catch (Exception e) {
            log.error("Failed to send WhatsApp template: {}", e.getMessage());
            throw new BadRequestException("Failed to send template message: " + e.getMessage());
        }
    }

    /**
     * Process incoming WhatsApp webhook event from Meta
     */
    @Transactional
    public void processWebhookEvent(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);

            // Meta sends "object": "whatsapp_business_account"
            if (!"whatsapp_business_account".equals(root.path("object").asText())) {
                log.warn("Ignoring non-WhatsApp webhook event");
                return;
            }

            JsonNode entries = root.path("entry");
            if (!entries.isArray()) return;

            for (JsonNode entry : entries) {
                JsonNode changes = entry.path("changes");
                if (!changes.isArray()) continue;

                for (JsonNode change : changes) {
                    String field = change.path("field").asText();
                    if (!"messages".equals(field)) continue;

                    JsonNode value = change.path("value");
                    processMessageValue(value);
                }
            }
        } catch (Exception e) {
            log.error("Failed to process WhatsApp webhook: {}", e.getMessage(), e);
        }
    }

    private void processMessageValue(JsonNode value) {
        JsonNode metadata = value.path("metadata");
        String phoneNumberId = metadata.path("phone_number_id").asText();

        // Find the channel config by phone number ID
        ChannelWhatsapp waConfig = channelWhatsappRepository.findByPhoneNumberId(phoneNumberId)
                .orElse(null);

        if (waConfig == null) {
            log.warn("No WhatsApp channel found for phone_number_id: {}", phoneNumberId);
            return;
        }

        // Find the inbox linked to this channel
        Inbox inbox = inboxRepository.findByChannelTypeAndChannelId(ChannelType.WHATSAPP, String.valueOf(waConfig.getId()))
                .orElse(null);

        if (inbox == null) {
            log.warn("No inbox found for WhatsApp channel ID: {}", waConfig.getId());
            return;
        }

        // Process status updates
        JsonNode statuses = value.path("statuses");
        if (statuses.isArray()) {
            for (JsonNode status : statuses) {
                processStatusUpdate(status);
            }
        }

        // Process incoming messages
        JsonNode messages = value.path("messages");
        JsonNode contacts = value.path("contacts");

        if (!messages.isArray()) return;

        for (int i = 0; i < messages.size(); i++) {
            JsonNode msg = messages.get(i);
            String from = msg.path("from").asText();
            String waMessageId = msg.path("id").asText();
            String type = msg.path("type").asText();
            String timestamp = msg.path("timestamp").asText();

            // Get contact name from webhook contacts array
            String contactName = from;
            if (contacts != null && contacts.isArray() && i < contacts.size()) {
                JsonNode profile = contacts.get(i).path("profile");
                if (profile.has("name")) {
                    contactName = profile.get("name").asText();
                }
            }

            // Extract message content based on type
            String content = extractMessageContent(msg, type);

            if (content != null) {
                // Extract media ID if this is a media message
                String mediaId = null;
                String mediaFileName = null;
                String mediaMimeType = null;
                if (MEDIA_TYPES.contains(type)) {
                    JsonNode mediaNode = msg.path(type);
                    mediaId = mediaNode.path("id").asText(null);
                    mediaMimeType = mediaNode.path("mime_type").asText(null);
                    if ("document".equals(type)) {
                        mediaFileName = mediaNode.path("filename").asText("document");
                    }
                }

                processIncomingMessage(inbox, waConfig, from, contactName, content, waMessageId, type,
                        mediaId, mediaFileName, mediaMimeType);
            }
        }
    }

    private String extractMessageContent(JsonNode msg, String type) {
        switch (type) {
            case "text":
                return msg.path("text").path("body").asText(null);
            case "image":
                String caption = msg.path("image").path("caption").asText("");
                return "[Image] " + (caption.isEmpty() ? "" : caption);
            case "video":
                return "[Video] " + msg.path("video").path("caption").asText("");
            case "audio":
                return "[Audio message]";
            case "document":
                String filename = msg.path("document").path("filename").asText("document");
                return "[Document: " + filename + "]";
            case "location":
                double lat = msg.path("location").path("latitude").asDouble();
                double lng = msg.path("location").path("longitude").asDouble();
                return "[Location: " + lat + ", " + lng + "]";
            case "contacts":
                return "[Contact card shared]";
            case "sticker":
                return "[Sticker]";
            case "reaction":
                String emoji = msg.path("reaction").path("emoji").asText("");
                return "[Reaction: " + emoji + "]";
            case "interactive":
                // Handle button replies and list replies from interactive messages
                JsonNode interactiveNode = msg.path("interactive");
                if (interactiveNode.has("button_reply")) {
                    String btnTitle = interactiveNode.path("button_reply").path("title").asText("");
                    String btnId = interactiveNode.path("button_reply").path("id").asText("");
                    return btnTitle.isEmpty() ? "[Button: " + btnId + "]" : btnTitle;
                } else if (interactiveNode.has("list_reply")) {
                    String listTitle = interactiveNode.path("list_reply").path("title").asText("");
                    String listDesc = interactiveNode.path("list_reply").path("description").asText("");
                    return listTitle + (listDesc.isEmpty() ? "" : " - " + listDesc);
                }
                return "[Interactive message]";
            default:
                return "[" + type + " message]";
        }
    }

    private void processIncomingMessage(Inbox inbox, ChannelWhatsapp waConfig, String phoneNumber,
                                         String contactName, String content, String waMessageId,
                                         String messageContentType, String mediaId,
                                         String mediaFileName, String mediaMimeType) {
        Long accountId = inbox.getAccount().getId();
        Account account = inbox.getAccount();

        // Normalize phone number (remove any + prefix for matching)
        String normalizedPhone = phoneNumber.startsWith("+") ? phoneNumber : "+" + phoneNumber;

        // Find or create contact by phone number
        Contact contact = contactRepository.findByPhoneNumberAndAccountId(normalizedPhone, accountId)
                .orElseGet(() -> {
                    Contact newContact = Contact.builder()
                            .account(account)
                            .name(contactName)
                            .phoneNumber(normalizedPhone)
                            .build();
                    return contactRepository.save(newContact);
                });

        // Update contact name if we got a real name
        if (contactName != null && !contactName.equals(contact.getPhoneNumber()) && !contactName.equals(contact.getName())) {
            contact.setName(contactName);
            contactRepository.save(contact);
        }

        // Find existing open conversation or create new
        Conversation conversation = conversationRepository
                .findByAccountIdAndContactIdAndInboxIdAndStatus(accountId, contact.getId(), inbox.getId())
                .orElseGet(() -> {
                    Long nextDisplayId = conversationRepository.findMaxDisplayIdByAccountId(accountId) + 1;
                    Conversation newConv = Conversation.builder()
                            .account(account)
                            .inbox(inbox)
                            .contact(contact)
                            .displayId(nextDisplayId)
                            .subject("WhatsApp: " + contactName)
                            .lastActivityAt(LocalDateTime.now())
                            .build();
                    return conversationRepository.save(newConv);
                });

        // Create incoming message
        Message message = Message.builder()
                .account(account)
                .conversation(conversation)
                .inbox(inbox)
                .content(content)
                .messageType(MessageType.INCOMING)
                .senderType(SenderType.CONTACT)
                .senderId(contact.getId())
                .externalId(waMessageId)
                .build();
        message = messageRepository.save(message);

        // Download and save media attachment if present
        List<AttachmentResponse> attachmentDtos = new ArrayList<>();
        if (mediaId != null && MEDIA_TYPES.contains(messageContentType)) {
            try {
                byte[] mediaBytes = downloadWhatsAppMedia(waConfig, mediaId);
                if (mediaBytes != null && mediaBytes.length > 0) {
                    String fileName = mediaFileName;
                    if (fileName == null) {
                        fileName = messageContentType + "_" + waMessageId;
                    }
                    Attachment savedAttachment = attachmentService.saveAttachmentFromBytes(
                            message, account, mediaBytes, fileName,
                            mediaMimeType, mediaBytes.length);
                    // Relative URL ("" base) -> resolves same-origin over https on the client;
                    // the frontend appends the auth ?token= before rendering.
                    attachmentDtos.add(AttachmentResponse.fromAttachment(savedAttachment, ""));
                    log.info("Downloaded and saved WhatsApp media: {} ({} bytes)", fileName, mediaBytes.length);
                }
            } catch (Exception e) {
                log.warn("Failed to download WhatsApp media {} for message {}: {}", mediaId, waMessageId, e.getMessage());
            }
        }

        conversation.setLastActivityAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        log.info("Processed incoming WhatsApp message from {} for conversation #{}", phoneNumber, conversation.getDisplayId());

        // Broadcast over WebSocket so open conversations and the inbox list update
        // live, without requiring a page refresh (mirrors the web-widget inbound path).
        webSocketEventService.broadcastNewMessage(accountId, conversation.getId(), Map.of(
                "id", message.getId(),
                "content", content,
                "messageType", "INCOMING",
                "senderType", "CONTACT",
                "senderId", contact.getId(),
                "senderName", contact.getName(),
                "privateFlag", false,
                "attachments", attachmentDtos,
                "createdAt", message.getCreatedAt() != null ? message.getCreatedAt().toString() : ""
        ));
        webSocketEventService.broadcastConversationUpdate(accountId, Map.of(
                "event", "conversation.updated",
                "conversationId", conversation.getId(),
                "displayId", conversation.getDisplayId(),
                "contactName", contact.getName(),
                "lastMessage", content
        ));

        // Check for opt-in/opt-out keywords (STOP, START, etc.)
        // This must happen before chatbot/automation so consent is always processed
        try {
            String consentReply = consentService.processIncomingForConsent(accountId, contact, content);
            if (consentReply != null) {
                // Send auto-reply confirming opt-in/opt-out
                sendConsentAutoReply(waConfig, contact.getPhoneNumber(), consentReply);
                log.info("Consent keyword detected from {}: message='{}', reply sent", phoneNumber, content.trim());
                return; // Don't process further — consent keywords aren't real conversations
            }
        } catch (Exception e) {
            log.warn("Consent processing error for {}: {}", phoneNumber, e.getMessage());
        }

        // Try chatbot flow first — if it handles the message, skip agent notification
        boolean handledByChatbot = false;
        try {
            handledByChatbot = chatbotEngine.processIncomingMessage(message, conversation);
        } catch (Exception e) {
            log.warn("Chatbot engine error for conversation #{}: {}", conversation.getDisplayId(), e.getMessage());
        }

        if (!handledByChatbot) {
            // Notify agents (only if chatbot didn't handle it)
            if (conversation.getAssignee() != null) {
                notificationService.notifyAssignee(accountId, conversation.getAssignee().getId(), null,
                        "new_message",
                        "New WhatsApp message in #" + conversation.getDisplayId(),
                        content.length() > 80 ? content.substring(0, 80) + "..." : content,
                        conversation.getId(),
                        Map.of("displayId", conversation.getDisplayId(), "senderName", contactName, "channel", "whatsapp"));
            }

            // Trigger automation rules
            automationEngine.onMessageCreated(message, conversation);
        }
    }

    /**
     * Send an auto-reply for consent keyword (STOP/START).
     * Uses direct WhatsApp API call to avoid consent checks on outgoing.
     */
    private void sendConsentAutoReply(ChannelWhatsapp waConfig, String phoneNumber, String replyText) {
        try {
            String url = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(waConfig.getAccessToken());

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("to", phoneNumber);
            body.put("type", "text");
            body.put("text", Map.of("body", replyText));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, String.class);
        } catch (Exception e) {
            log.warn("Failed to send consent auto-reply to {}: {}", phoneNumber, e.getMessage());
        }
    }

    /**
     * Download media from WhatsApp Cloud API.
     * Step 1: GET media URL from media ID
     * Step 2: Download the actual file bytes
     */
    private byte[] downloadWhatsAppMedia(ChannelWhatsapp waConfig, String mediaId) {
        try {
            // Step 1: Get the media URL
            String metaUrl = waConfig.getApiBaseUrl().replace("/" + waConfig.getPhoneNumberId() + "/messages", "")
                    .replaceAll("/v[0-9.]+/.*", "");
            // Build the correct media endpoint: https://graph.facebook.com/v21.0/{mediaId}
            String mediaInfoUrl = "https://graph.facebook.com/v21.0/" + mediaId;

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(waConfig.getAccessToken());

            ResponseEntity<String> infoResponse = restTemplate.exchange(
                    mediaInfoUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            if (!infoResponse.getStatusCode().is2xxSuccessful() || infoResponse.getBody() == null) {
                log.warn("Failed to get media info for ID: {}", mediaId);
                return null;
            }

            JsonNode mediaInfo = objectMapper.readTree(infoResponse.getBody());
            String downloadUrl = mediaInfo.path("url").asText(null);

            if (downloadUrl == null) {
                log.warn("No URL in media info for ID: {}", mediaId);
                return null;
            }

            // Step 2: Download the actual media file
            ResponseEntity<byte[]> fileResponse = restTemplate.exchange(
                    downloadUrl, HttpMethod.GET, new HttpEntity<>(headers), byte[].class);

            if (fileResponse.getStatusCode().is2xxSuccessful()) {
                return fileResponse.getBody();
            }

            return null;
        } catch (Exception e) {
            log.error("Error downloading WhatsApp media {}: {}", mediaId, e.getMessage());
            return null;
        }
    }

    /**
     * Send a WhatsApp media message (image, video, audio, document) via Meta Cloud API
     */
    public void sendWhatsAppMediaMessage(Long accountId, Long conversationId, Long senderId,
                                          String content, Long attachmentId) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        Inbox inbox = conv.getInbox();
        if (inbox.getChannelType() != ChannelType.WHATSAPP) {
            return; // Not a WhatsApp conversation, skip
        }

        ChannelWhatsapp waConfig = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId()))
                .orElseThrow(() -> new ResourceNotFoundException("WhatsApp channel config not found"));

        Contact contact = conv.getContact();
        if (contact.getPhoneNumber() == null || contact.getPhoneNumber().isEmpty()) {
            throw new BadRequestException("Contact does not have a phone number");
        }

        Attachment attachment = attachmentService.getAttachment(attachmentId);

        try {
            // Step 1: Upload media to WhatsApp
            String mediaUploadUrl = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/media";

            HttpHeaders uploadHeaders = new HttpHeaders();
            uploadHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
            uploadHeaders.setBearerAuth(waConfig.getAccessToken());

            org.springframework.util.LinkedMultiValueMap<String, Object> uploadBody =
                    new org.springframework.util.LinkedMultiValueMap<>();
            uploadBody.add("messaging_product", "whatsapp");
            uploadBody.add("type", attachment.getContentType());

            // Load file bytes and create a ByteArrayResource
            byte[] fileBytes = fileStorageService.loadFile(attachment.getFilePath());
            org.springframework.core.io.ByteArrayResource fileResource =
                    new org.springframework.core.io.ByteArrayResource(fileBytes) {
                        @Override
                        public String getFilename() {
                            return attachment.getFileName();
                        }
                    };
            uploadBody.add("file", fileResource);

            HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> uploadRequest =
                    new HttpEntity<>(uploadBody, uploadHeaders);
            ResponseEntity<String> uploadResponse = restTemplate.postForEntity(mediaUploadUrl, uploadRequest, String.class);

            if (!uploadResponse.getStatusCode().is2xxSuccessful() || uploadResponse.getBody() == null) {
                log.error("Failed to upload media to WhatsApp for conversation #{}", conv.getDisplayId());
                return;
            }

            JsonNode uploadJson = objectMapper.readTree(uploadResponse.getBody());
            String waMediaId = uploadJson.path("id").asText(null);

            if (waMediaId == null) {
                log.error("No media ID returned from WhatsApp upload");
                return;
            }

            // Step 2: Send the media message
            String sendUrl = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

            HttpHeaders sendHeaders = new HttpHeaders();
            sendHeaders.setContentType(MediaType.APPLICATION_JSON);
            sendHeaders.setBearerAuth(waConfig.getAccessToken());

            // Determine WhatsApp media type
            String waMediaType = switch (attachment.getFileType()) {
                case IMAGE -> "image";
                case VIDEO -> "video";
                case AUDIO -> "audio";
                default -> "document";
            };

            Map<String, Object> mediaPayload = new HashMap<>();
            mediaPayload.put("id", waMediaId);
            if (content != null && !content.isEmpty() && ("image".equals(waMediaType) || "video".equals(waMediaType))) {
                mediaPayload.put("caption", content);
            }
            if ("document".equals(waMediaType)) {
                mediaPayload.put("filename", attachment.getFileName());
                if (content != null && !content.isEmpty()) {
                    mediaPayload.put("caption", content);
                }
            }

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", contact.getPhoneNumber());
            body.put("type", waMediaType);
            body.put(waMediaType, mediaPayload);

            HttpEntity<Map<String, Object>> sendRequest = new HttpEntity<>(body, sendHeaders);
            ResponseEntity<String> sendResponse = restTemplate.postForEntity(sendUrl, sendRequest, String.class);

            if (sendResponse.getStatusCode().is2xxSuccessful()) {
                log.info("WhatsApp media message ({}) sent to {} for conversation #{}",
                        waMediaType, contact.getPhoneNumber(), conv.getDisplayId());

                // Update the message's external ID for delivery tracking
                JsonNode responseJson = objectMapper.readTree(sendResponse.getBody());
                if (responseJson.has("messages") && responseJson.get("messages").isArray()) {
                    String waMessageId = responseJson.get("messages").get(0).get("id").asText();
                    // Find the latest outgoing message in this conversation to update its externalId
                    // This is called right after MessageService saves the message
                }
            }

        } catch (Exception e) {
            log.error("Failed to send WhatsApp media message for conversation #{}: {}", conv.getDisplayId(), e.getMessage());
        }
    }

    /**
     * Send outgoing message content + attachments via WhatsApp API.
     * Called by MessageService after saving the message.
     */
    public void sendOutgoingWhatsAppMessage(Long accountId, Long conversationId, Message message,
                                             java.util.List<Attachment> attachments) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElse(null);
        if (conv == null || conv.getInbox().getChannelType() != ChannelType.WHATSAPP) {
            return; // Not a WhatsApp conversation
        }

        ChannelWhatsapp waConfig = channelWhatsappRepository.findById(Long.parseLong(conv.getInbox().getChannelId()))
                .orElse(null);
        if (waConfig == null) return;

        Contact contact = conv.getContact();
        if (contact.getPhoneNumber() == null || contact.getPhoneNumber().isEmpty()) return;

        try {
            if (attachments != null && !attachments.isEmpty()) {
                // Send each attachment as a separate WhatsApp media message
                for (int i = 0; i < attachments.size(); i++) {
                    Attachment att = attachments.get(i);
                    // Include text caption only with the first attachment
                    String caption = (i == 0 && message.getContent() != null && !message.getContent().isEmpty())
                            ? message.getContent() : null;
                    String waMessageId = uploadAndSendMedia(waConfig, contact.getPhoneNumber(), att, caption);
                    if (waMessageId != null && i == 0) {
                        message.setExternalId(waMessageId);
                        messageRepository.save(message);
                    }
                }
            } else {
                // Check if this is an interactive message
                Map<String, Object> attrs = message.getContentAttributes();
                String contentType = attrs != null ? String.valueOf(attrs.getOrDefault("contentType", "text")) : "text";

                if ("interactive_buttons".equals(contentType) || "interactive_list".equals(contentType)) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> interactiveData = attrs != null
                            ? (Map<String, Object>) attrs.get("interactiveData") : null;
                    if (interactiveData != null) {
                        sendInteractiveViaApi(waConfig, contact.getPhoneNumber(), contentType, interactiveData, message);
                    }
                } else if (message.getContent() != null && !message.getContent().isEmpty()) {
                    // Text-only message — send via existing text API
                    sendTextViaApi(waConfig, contact.getPhoneNumber(), message.getContent(), message);
                }
            }
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message for conversation #{}: {}", conv.getDisplayId(), e.getMessage());
        }
    }

    private String uploadAndSendMedia(ChannelWhatsapp waConfig, String phoneNumber,
                                       Attachment attachment, String caption) {
        try {
            // Step 1: Upload media
            String mediaUploadUrl = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/media";

            HttpHeaders uploadHeaders = new HttpHeaders();
            uploadHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
            uploadHeaders.setBearerAuth(waConfig.getAccessToken());

            org.springframework.util.LinkedMultiValueMap<String, Object> uploadBody =
                    new org.springframework.util.LinkedMultiValueMap<>();
            uploadBody.add("messaging_product", "whatsapp");
            uploadBody.add("type", attachment.getContentType());

            byte[] fileBytes = fileStorageService.loadFile(attachment.getFilePath());
            org.springframework.core.io.ByteArrayResource fileResource =
                    new org.springframework.core.io.ByteArrayResource(fileBytes) {
                        @Override
                        public String getFilename() {
                            return attachment.getFileName();
                        }
                    };
            uploadBody.add("file", fileResource);

            HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> uploadRequest =
                    new HttpEntity<>(uploadBody, uploadHeaders);
            ResponseEntity<String> uploadResponse = restTemplate.postForEntity(mediaUploadUrl, uploadRequest, String.class);

            if (!uploadResponse.getStatusCode().is2xxSuccessful()) {
                log.warn("Media upload failed for {}", attachment.getFileName());
                return null;
            }

            JsonNode uploadJson = objectMapper.readTree(uploadResponse.getBody());
            String waMediaId = uploadJson.path("id").asText(null);
            if (waMediaId == null) return null;

            // Step 2: Send media message
            String sendUrl = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

            HttpHeaders sendHeaders = new HttpHeaders();
            sendHeaders.setContentType(MediaType.APPLICATION_JSON);
            sendHeaders.setBearerAuth(waConfig.getAccessToken());

            String waMediaType = switch (attachment.getFileType()) {
                case IMAGE -> "image";
                case VIDEO -> "video";
                case AUDIO -> "audio";
                default -> "document";
            };

            Map<String, Object> mediaPayload = new HashMap<>();
            mediaPayload.put("id", waMediaId);
            if (caption != null && !caption.isEmpty() &&
                ("image".equals(waMediaType) || "video".equals(waMediaType) || "document".equals(waMediaType))) {
                mediaPayload.put("caption", caption);
            }
            if ("document".equals(waMediaType)) {
                mediaPayload.put("filename", attachment.getFileName());
            }

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", phoneNumber);
            body.put("type", waMediaType);
            body.put(waMediaType, mediaPayload);

            HttpEntity<Map<String, Object>> sendRequest = new HttpEntity<>(body, sendHeaders);
            ResponseEntity<String> sendResponse = restTemplate.postForEntity(sendUrl, sendRequest, String.class);

            if (sendResponse.getStatusCode().is2xxSuccessful()) {
                JsonNode responseJson = objectMapper.readTree(sendResponse.getBody());
                if (responseJson.has("messages") && responseJson.get("messages").isArray()) {
                    return responseJson.get("messages").get(0).get("id").asText();
                }
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to upload and send media {}: {}", attachment.getFileName(), e.getMessage());
            return null;
        }
    }

    private void sendTextViaApi(ChannelWhatsapp waConfig, String phoneNumber, String content, Message message) {
        String url = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(waConfig.getAccessToken());

        Map<String, Object> body = new HashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("recipient_type", "individual");
        body.put("to", phoneNumber);
        body.put("type", "text");
        body.put("text", Map.of("body", content));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            try {
                JsonNode responseJson = objectMapper.readTree(response.getBody());
                if (responseJson.has("messages") && responseJson.get("messages").isArray()) {
                    String waMessageId = responseJson.get("messages").get(0).get("id").asText();
                    message.setExternalId(waMessageId);
                    messageRepository.save(message);
                }
            } catch (Exception e) {
                log.warn("Failed to parse WhatsApp send response: {}", e.getMessage());
            }
        }
    }

    /**
     * Send interactive message (buttons or list) via WhatsApp Cloud API.
     */
    @SuppressWarnings("unchecked")
    private void sendInteractiveViaApi(ChannelWhatsapp waConfig, String phoneNumber,
                                        String contentType, Map<String, Object> interactiveData,
                                        Message message) {
        String url = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(waConfig.getAccessToken());

        // Build WhatsApp interactive message payload
        Map<String, Object> interactive = new HashMap<>();

        // Type: button or list
        interactive.put("type", "interactive_buttons".equals(contentType) ? "button" : "list");

        // Header (optional)
        String headerText = (String) interactiveData.get("header");
        if (headerText != null && !headerText.isEmpty()) {
            interactive.put("header", Map.of("type", "text", "text", headerText));
        }

        // Body (required)
        String bodyText = (String) interactiveData.getOrDefault("body", "");
        interactive.put("body", Map.of("text", bodyText));

        // Footer (optional)
        String footerText = (String) interactiveData.get("footer");
        if (footerText != null && !footerText.isEmpty()) {
            interactive.put("footer", Map.of("text", footerText));
        }

        // Action
        Map<String, Object> action = new HashMap<>();

        if ("interactive_buttons".equals(contentType)) {
            // Quick reply buttons (max 3)
            List<Map<String, Object>> buttons = (List<Map<String, Object>>) interactiveData.get("buttons");
            if (buttons != null) {
                java.util.List<Map<String, Object>> waButtons = new java.util.ArrayList<>();
                for (int i = 0; i < Math.min(buttons.size(), 3); i++) {
                    Map<String, Object> btn = buttons.get(i);
                    waButtons.add(Map.of(
                            "type", "reply",
                            "reply", Map.of(
                                    "id", btn.getOrDefault("id", "btn_" + i),
                                    "title", btn.getOrDefault("title", "Button " + (i + 1))
                            )
                    ));
                }
                action.put("buttons", waButtons);
            }
        } else {
            // List message
            String buttonText = (String) interactiveData.getOrDefault("buttonText", "View Options");
            action.put("button", buttonText);

            List<Map<String, Object>> sections = (List<Map<String, Object>>) interactiveData.get("sections");
            if (sections != null) {
                java.util.List<Map<String, Object>> waSections = new java.util.ArrayList<>();
                for (Map<String, Object> section : sections) {
                    Map<String, Object> waSection = new HashMap<>();
                    waSection.put("title", section.getOrDefault("title", "Options"));

                    List<Map<String, Object>> rows = (List<Map<String, Object>>) section.get("rows");
                    if (rows != null) {
                        java.util.List<Map<String, Object>> waRows = new java.util.ArrayList<>();
                        for (Map<String, Object> row : rows) {
                            Map<String, Object> waRow = new HashMap<>();
                            waRow.put("id", row.getOrDefault("id", "row_" + waRows.size()));
                            waRow.put("title", row.getOrDefault("title", ""));
                            if (row.containsKey("description") && row.get("description") != null) {
                                waRow.put("description", row.get("description"));
                            }
                            waRows.add(waRow);
                        }
                        waSection.put("rows", waRows);
                    }
                    waSections.add(waSection);
                }
                action.put("sections", waSections);
            }
        }

        interactive.put("action", action);

        Map<String, Object> body = new HashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("recipient_type", "individual");
        body.put("to", phoneNumber);
        body.put("type", "interactive");
        body.put("interactive", interactive);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            try {
                JsonNode responseJson = objectMapper.readTree(response.getBody());
                if (responseJson.has("messages") && responseJson.get("messages").isArray()) {
                    String waMessageId = responseJson.get("messages").get(0).get("id").asText();
                    message.setExternalId(waMessageId);
                    messageRepository.save(message);
                }
            } catch (Exception e) {
                log.warn("Failed to parse interactive send response: {}", e.getMessage());
            }
        } else {
            log.error("Failed to send interactive WhatsApp message: {}", response.getBody());
        }
    }

    private void processStatusUpdate(JsonNode status) {
        String messageId = status.path("id").asText();
        String statusValue = status.path("status").asText();
        // Status can be: sent, delivered, read, failed
        log.debug("WhatsApp message {} status: {}", messageId, statusValue);

        // Update broadcast contact delivery status
        try {
            broadcastService.updateDeliveryStatus(messageId, statusValue);
        } catch (Exception e) {
            log.warn("Failed to update broadcast delivery status for message {}: {}", messageId, e.getMessage());
        }

        // Update regular conversation message delivery status
        try {
            Message message = messageRepository.findByExternalId(messageId).orElse(null);
            if (message != null) {
                switch (statusValue.toLowerCase()) {
                    case "sent":
                        message.setDeliveryStatus("sent");
                        break;
                    case "delivered":
                        message.setDeliveryStatus("delivered");
                        break;
                    case "read":
                        message.setDeliveryStatus("read");
                        break;
                    case "failed":
                        message.setDeliveryStatus("failed");
                        break;
                }
                messageRepository.save(message);

                // Notify frontend via WebSocket
                webSocketEventService.sendMessageStatusUpdate(
                        message.getConversation().getAccount().getId(),
                        message.getConversation().getId(),
                        message.getId(),
                        statusValue
                );
            }
        } catch (Exception e) {
            log.warn("Failed to update message delivery status for {}: {}", messageId, e.getMessage());
        }
    }

    /**
     * Verify webhook from Meta
     */
    public boolean verifyWebhook(String mode, String token, String phoneNumberId) {
        if (!"subscribe".equals(mode)) return false;

        // Find the channel config and verify the token
        ChannelWhatsapp config = channelWhatsappRepository.findByPhoneNumberId(phoneNumberId)
                .orElse(null);

        if (config != null && config.getWebhookVerifyToken().equals(token)) {
            return true;
        }

        // Also try to find by the token itself (Meta sends the verify_token we configured)
        return channelWhatsappRepository.findAll().stream()
                .anyMatch(c -> c.getWebhookVerifyToken().equals(token));
    }
}
