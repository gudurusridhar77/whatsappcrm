package com.whatsappcrm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.whatsappcrm.dto.BroadcastRequest;
import com.whatsappcrm.dto.BroadcastResponse;
import com.whatsappcrm.entity.*;
import com.whatsappcrm.enums.ChannelType;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BroadcastService {

    private final BroadcastRepository broadcastRepository;
    private final BroadcastContactRepository broadcastContactRepository;
    private final WhatsAppTemplateRepository templateRepository;
    private final InboxRepository inboxRepository;
    private final ChannelWhatsappRepository channelWhatsappRepository;
    private final ContactRepository contactRepository;
    private final AccountRepository accountRepository;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    public List<BroadcastResponse> getBroadcasts(Long accountId) {
        return broadcastRepository.findByAccountIdOrderByCreatedAtDesc(accountId).stream()
                .map(BroadcastResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public BroadcastResponse getBroadcast(Long accountId, Long broadcastId) {
        Broadcast b = broadcastRepository.findByIdAndAccountId(broadcastId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Broadcast not found"));
        return BroadcastResponse.fromEntity(b);
    }

    @Transactional
    public BroadcastResponse createBroadcast(Long accountId, BroadcastRequest request, Long userId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        Inbox inbox = inboxRepository.findByIdAndAccountId(request.getInboxId(), accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        if (inbox.getChannelType() != ChannelType.WHATSAPP) {
            throw new BadRequestException("Broadcast is only supported for WhatsApp inboxes");
        }

        WhatsAppTemplate template = templateRepository.findByIdAndAccountId(request.getTemplateId(), accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));

        if (template.getStatus() != WhatsAppTemplate.TemplateStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED templates can be used for broadcasts. Status: " + template.getStatus());
        }

        // Build default params map
        Map<String, Object> defaultParams = new HashMap<>();
        if (request.getDefaultBodyParams() != null) {
            defaultParams.put("bodyParams", request.getDefaultBodyParams());
        }

        Broadcast broadcast = Broadcast.builder()
                .account(account)
                .inbox(inbox)
                .template(template)
                .name(request.getName())
                .description(request.getDescription())
                .defaultParams(defaultParams)
                .createdBy(userId)
                .status(Broadcast.BroadcastStatus.DRAFT)
                .build();

        if (request.getScheduledAt() != null) {
            broadcast.setScheduledAt(LocalDateTime.parse(request.getScheduledAt()));
            broadcast.setStatus(Broadcast.BroadcastStatus.SCHEDULED);
        }

        broadcast = broadcastRepository.save(broadcast);

        // Add contacts
        List<Contact> contacts;
        if (request.getContactIds() != null && !request.getContactIds().isEmpty()) {
            contacts = request.getContactIds().stream()
                    .map(cid -> contactRepository.findByIdAndAccountId(cid, accountId).orElse(null))
                    .filter(c -> c != null && c.getPhoneNumber() != null && !c.getPhoneNumber().isEmpty())
                    .collect(Collectors.toList());
        } else {
            // All contacts with phone numbers
            contacts = contactRepository.findByAccountId(accountId, org.springframework.data.domain.Pageable.unpaged())
                    .getContent().stream()
                    .filter(c -> c.getPhoneNumber() != null && !c.getPhoneNumber().isEmpty())
                    .collect(Collectors.toList());
        }

        for (Contact contact : contacts) {
            BroadcastContact bc = BroadcastContact.builder()
                    .broadcast(broadcast)
                    .contact(contact)
                    .status(BroadcastContact.MessageDeliveryStatus.PENDING)
                    .build();
            broadcastContactRepository.save(bc);
        }

        broadcast.setTotalCount(contacts.size());
        broadcast = broadcastRepository.save(broadcast);

        return BroadcastResponse.fromEntity(broadcast);
    }

    @Transactional
    public BroadcastResponse startBroadcast(Long accountId, Long broadcastId) {
        Broadcast broadcast = broadcastRepository.findByIdAndAccountId(broadcastId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Broadcast not found"));

        if (broadcast.getStatus() != Broadcast.BroadcastStatus.DRAFT &&
                broadcast.getStatus() != Broadcast.BroadcastStatus.SCHEDULED) {
            throw new BadRequestException("Broadcast is already " + broadcast.getStatus());
        }

        broadcast.setStatus(Broadcast.BroadcastStatus.PROCESSING);
        broadcast.setStartedAt(LocalDateTime.now());
        broadcastRepository.save(broadcast);

        // Process asynchronously
        processBroadcastAsync(broadcast.getId(), accountId);

        return BroadcastResponse.fromEntity(broadcast);
    }

    @Async
    public void processBroadcastAsync(Long broadcastId, Long accountId) {
        try {
            Broadcast broadcast = broadcastRepository.findById(broadcastId).orElse(null);
            if (broadcast == null) return;

            Inbox inbox = broadcast.getInbox();
            ChannelWhatsapp waConfig = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId()))
                    .orElse(null);
            if (waConfig == null) {
                broadcast.setStatus(Broadcast.BroadcastStatus.FAILED);
                broadcastRepository.save(broadcast);
                return;
            }

            WhatsAppTemplate template = broadcast.getTemplate();
            List<BroadcastContact> pendingContacts = broadcastContactRepository
                    .findByBroadcastIdAndStatus(broadcastId, BroadcastContact.MessageDeliveryStatus.PENDING);

            @SuppressWarnings("unchecked")
            List<String> defaultBodyParams = (List<String>) broadcast.getDefaultParams().get("bodyParams");

            int sentCount = 0;
            int failedCount = 0;

            for (BroadcastContact bc : pendingContacts) {
                try {
                    Contact contact = bc.getContact();
                    String phone = contact.getPhoneNumber();
                    if (phone == null || phone.isEmpty()) {
                        bc.setStatus(BroadcastContact.MessageDeliveryStatus.FAILED);
                        bc.setErrorMessage("No phone number");
                        broadcastContactRepository.save(bc);
                        failedCount++;
                        continue;
                    }

                    // Build and send template message
                    String url = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    headers.setBearerAuth(waConfig.getAccessToken());

                    Map<String, Object> payload = new HashMap<>();
                    payload.put("messaging_product", "whatsapp");
                    payload.put("to", phone);
                    payload.put("type", "template");

                    Map<String, Object> templatePayload = new HashMap<>();
                    templatePayload.put("name", template.getName());
                    templatePayload.put("language", Map.of("code", template.getLanguage()));

                    // Add body parameters
                    if (defaultBodyParams != null && !defaultBodyParams.isEmpty()) {
                        List<Map<String, Object>> bodyParameters = new ArrayList<>();
                        for (String param : defaultBodyParams) {
                            // Replace {{name}} placeholders with contact data
                            String resolved = param
                                    .replace("{{name}}", contact.getName() != null ? contact.getName() : "")
                                    .replace("{{phone}}", phone)
                                    .replace("{{email}}", contact.getEmail() != null ? contact.getEmail() : "")
                                    .replace("{{company}}", contact.getCompany() != null ? contact.getCompany() : "");
                            bodyParameters.add(Map.of("type", "text", "text", resolved));
                        }
                        templatePayload.put("components", List.of(
                                Map.of("type", "body", "parameters", bodyParameters)
                        ));
                    }

                    payload.put("template", templatePayload);

                    HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
                    ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

                    if (response.getStatusCode().is2xxSuccessful()) {
                        // Parse message ID
                        JsonNode responseJson = objectMapper.readTree(response.getBody());
                        String messageId = null;
                        if (responseJson.has("messages") && responseJson.get("messages").isArray()) {
                            messageId = responseJson.get("messages").get(0).get("id").asText();
                        }

                        bc.setStatus(BroadcastContact.MessageDeliveryStatus.SENT);
                        bc.setExternalMessageId(messageId);
                        bc.setSentAt(LocalDateTime.now());
                        sentCount++;
                    } else {
                        bc.setStatus(BroadcastContact.MessageDeliveryStatus.FAILED);
                        bc.setErrorMessage("API error: " + response.getStatusCode());
                        failedCount++;
                    }

                } catch (Exception e) {
                    bc.setStatus(BroadcastContact.MessageDeliveryStatus.FAILED);
                    bc.setErrorMessage(e.getMessage());
                    failedCount++;
                }
                broadcastContactRepository.save(bc);

                // Rate limiting: WhatsApp has limits, add small delay
                try { Thread.sleep(100); } catch (InterruptedException ignored) {}
            }

            // Update broadcast stats
            broadcast.setSentCount(sentCount);
            broadcast.setFailedCount(failedCount);
            broadcast.setStatus(Broadcast.BroadcastStatus.COMPLETED);
            broadcast.setCompletedAt(LocalDateTime.now());
            broadcastRepository.save(broadcast);

            log.info("Broadcast '{}' completed: {} sent, {} failed out of {} total",
                    broadcast.getName(), sentCount, failedCount, broadcast.getTotalCount());

        } catch (Exception e) {
            log.error("Broadcast processing failed: {}", e.getMessage());
            Broadcast broadcast = broadcastRepository.findById(broadcastId).orElse(null);
            if (broadcast != null) {
                broadcast.setStatus(Broadcast.BroadcastStatus.FAILED);
                broadcastRepository.save(broadcast);
            }
        }
    }

    @Transactional
    public void cancelBroadcast(Long accountId, Long broadcastId) {
        Broadcast broadcast = broadcastRepository.findByIdAndAccountId(broadcastId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Broadcast not found"));

        if (broadcast.getStatus() == Broadcast.BroadcastStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel a completed broadcast");
        }

        broadcast.setStatus(Broadcast.BroadcastStatus.CANCELLED);
        broadcastRepository.save(broadcast);
    }

    @Transactional
    public void deleteBroadcast(Long accountId, Long broadcastId) {
        Broadcast broadcast = broadcastRepository.findByIdAndAccountId(broadcastId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Broadcast not found"));

        broadcastContactRepository.deleteByBroadcastId(broadcastId);
        broadcastRepository.delete(broadcast);
    }

    /**
     * Update delivery status from WhatsApp webhook callback
     */
    @Transactional
    public void updateDeliveryStatus(String externalMessageId, String status) {
        BroadcastContact bc = broadcastContactRepository.findByExternalMessageId(externalMessageId)
                .orElse(null);

        if (bc == null) return;

        switch (status.toLowerCase()) {
            case "delivered":
                bc.setStatus(BroadcastContact.MessageDeliveryStatus.DELIVERED);
                bc.setDeliveredAt(LocalDateTime.now());
                break;
            case "read":
                bc.setStatus(BroadcastContact.MessageDeliveryStatus.READ);
                bc.setReadAt(LocalDateTime.now());
                break;
            case "failed":
                bc.setStatus(BroadcastContact.MessageDeliveryStatus.FAILED);
                break;
        }
        broadcastContactRepository.save(bc);

        // Update broadcast aggregate counts
        Broadcast broadcast = bc.getBroadcast();
        broadcast.setDeliveredCount((int) broadcastContactRepository.countByBroadcastIdAndStatus(
                broadcast.getId(), BroadcastContact.MessageDeliveryStatus.DELIVERED));
        broadcast.setReadCount((int) broadcastContactRepository.countByBroadcastIdAndStatus(
                broadcast.getId(), BroadcastContact.MessageDeliveryStatus.READ));
        broadcast.setFailedCount((int) broadcastContactRepository.countByBroadcastIdAndStatus(
                broadcast.getId(), BroadcastContact.MessageDeliveryStatus.FAILED));
        broadcastRepository.save(broadcast);
    }
}
