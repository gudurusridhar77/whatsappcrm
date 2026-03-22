package com.whatsappcrm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.whatsappcrm.entity.*;
import com.whatsappcrm.repository.ChannelWhatsappRepository;
import com.whatsappcrm.repository.ScheduledMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Runs every 30 seconds. Picks up PENDING scheduled messages whose scheduledAt <= now,
 * and sends them (direct text, template message, or triggers a broadcast).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MessageScheduler {

    private final ScheduledMessageRepository scheduledMessageRepository;
    private final ChannelWhatsappRepository channelWhatsappRepository;
    private final BroadcastService broadcastService;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    @Scheduled(fixedDelay = 30000) // every 30 seconds
    @Transactional
    public void processScheduledMessages() {
        List<ScheduledMessage> dueMessages = scheduledMessageRepository
                .findByStatusAndScheduledAtBefore(ScheduledMessage.ScheduleStatus.PENDING, LocalDateTime.now());

        if (dueMessages.isEmpty()) return;

        log.info("Processing {} due scheduled messages", dueMessages.size());

        for (ScheduledMessage sm : dueMessages) {
            sm.setStatus(ScheduledMessage.ScheduleStatus.PROCESSING);
            scheduledMessageRepository.save(sm);

            try {
                switch (sm.getScheduleType()) {
                    case DIRECT:
                        sendDirectMessage(sm);
                        break;
                    case TEMPLATE:
                        sendTemplateMessage(sm);
                        break;
                    case BROADCAST:
                        triggerBroadcast(sm);
                        break;
                }

                sm.setStatus(ScheduledMessage.ScheduleStatus.SENT);
                sm.setSentAt(LocalDateTime.now());
                log.info("Scheduled message sent: id={}, type={}", sm.getId(), sm.getScheduleType());

            } catch (Exception e) {
                sm.setStatus(ScheduledMessage.ScheduleStatus.FAILED);
                sm.setFailureReason(e.getMessage() != null ? e.getMessage().substring(0, Math.min(e.getMessage().length(), 500)) : "Unknown error");
                log.error("Failed to send scheduled message id={}: {}", sm.getId(), e.getMessage());
            }

            scheduledMessageRepository.save(sm);
        }
    }

    private void sendDirectMessage(ScheduledMessage sm) {
        Inbox inbox = sm.getInbox();
        Contact contact = sm.getContact();

        ChannelWhatsapp waConfig = channelWhatsappRepository
                .findById(Long.parseLong(inbox.getChannelId()))
                .orElseThrow(() -> new RuntimeException("WhatsApp channel configuration not found"));

        String url = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(waConfig.getAccessToken());

        Map<String, Object> payload = new HashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("to", contact.getPhoneNumber());
        payload.put("type", "text");
        payload.put("text", Map.of("body", sm.getContent()));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("WhatsApp API error: " + response.getStatusCode());
        }
    }

    @SuppressWarnings("unchecked")
    private void sendTemplateMessage(ScheduledMessage sm) {
        Inbox inbox = sm.getInbox();
        Contact contact = sm.getContact();
        WhatsAppTemplate template = sm.getTemplate();

        ChannelWhatsapp waConfig = channelWhatsappRepository
                .findById(Long.parseLong(inbox.getChannelId()))
                .orElseThrow(() -> new RuntimeException("WhatsApp channel configuration not found"));

        String url = waConfig.getApiBaseUrl() + "/" + waConfig.getPhoneNumberId() + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(waConfig.getAccessToken());

        Map<String, Object> payload = new HashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("to", contact.getPhoneNumber());
        payload.put("type", "template");

        Map<String, Object> templatePayload = new HashMap<>();
        templatePayload.put("name", template.getName());
        templatePayload.put("language", Map.of("code", template.getLanguage()));

        // Add body parameters
        List<String> bodyParams = null;
        if (sm.getTemplateParams() != null && sm.getTemplateParams().containsKey("bodyParams")) {
            Object p = sm.getTemplateParams().get("bodyParams");
            if (p instanceof List) {
                bodyParams = (List<String>) p;
            }
        }

        if (bodyParams != null && !bodyParams.isEmpty()) {
            List<Map<String, Object>> parameters = new ArrayList<>();
            for (String param : bodyParams) {
                String resolved = param
                        .replace("{{name}}", contact.getName() != null ? contact.getName() : "")
                        .replace("{{phone}}", contact.getPhoneNumber() != null ? contact.getPhoneNumber() : "")
                        .replace("{{email}}", contact.getEmail() != null ? contact.getEmail() : "")
                        .replace("{{company}}", contact.getCompany() != null ? contact.getCompany() : "");
                parameters.add(Map.of("type", "text", "text", resolved));
            }
            templatePayload.put("components", List.of(
                    Map.of("type", "body", "parameters", parameters)
            ));
        }

        payload.put("template", templatePayload);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("WhatsApp API error: " + response.getStatusCode());
        }
    }

    private void triggerBroadcast(ScheduledMessage sm) {
        Broadcast broadcast = sm.getBroadcast();
        if (broadcast == null) {
            throw new RuntimeException("No broadcast linked to this scheduled message");
        }

        Long accountId = sm.getAccount().getId();
        broadcastService.startBroadcast(accountId, broadcast.getId());
    }
}
