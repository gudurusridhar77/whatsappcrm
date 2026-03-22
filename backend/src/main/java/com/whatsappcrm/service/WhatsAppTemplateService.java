package com.whatsappcrm.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.whatsappcrm.dto.SendTemplateRequest;
import com.whatsappcrm.dto.WhatsAppTemplateRequest;
import com.whatsappcrm.dto.WhatsAppTemplateResponse;
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
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppTemplateService {

    private final WhatsAppTemplateRepository templateRepository;
    private final InboxRepository inboxRepository;
    private final ChannelWhatsappRepository channelWhatsappRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AccountRepository accountRepository;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    // ========== CRUD Operations ==========

    public List<WhatsAppTemplateResponse> getTemplates(Long accountId, Long inboxId) {
        List<WhatsAppTemplate> templates;
        if (inboxId != null) {
            templates = templateRepository.findByAccountIdAndInboxId(accountId, inboxId);
        } else {
            templates = templateRepository.findByAccountId(accountId);
        }
        return templates.stream()
                .map(WhatsAppTemplateResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public WhatsAppTemplateResponse getTemplate(Long accountId, Long templateId) {
        WhatsAppTemplate template = templateRepository.findByIdAndAccountId(templateId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        return WhatsAppTemplateResponse.fromEntity(template);
    }

    @Transactional
    public WhatsAppTemplateResponse createTemplate(Long accountId, WhatsAppTemplateRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        Inbox inbox = inboxRepository.findByIdAndAccountId(request.getInboxId(), accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        if (inbox.getChannelType() != ChannelType.WHATSAPP) {
            throw new BadRequestException("Inbox is not a WhatsApp channel");
        }

        // Check for duplicate
        templateRepository.findByAccountIdAndInboxIdAndNameAndLanguage(
                accountId, inbox.getId(), request.getName(), request.getLanguage())
                .ifPresent(t -> {
                    throw new BadRequestException("Template with name '" + request.getName() +
                            "' and language '" + request.getLanguage() + "' already exists");
                });

        // Count parameters in body
        int bodyParamCount = countParameters(request.getBody());
        int headerParamCount = "TEXT".equals(request.getHeaderType()) ?
                countParameters(request.getHeaderText()) : 0;

        // Parse category
        WhatsAppTemplate.TemplateCategory category;
        try {
            category = WhatsAppTemplate.TemplateCategory.valueOf(request.getCategory().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid category. Must be MARKETING, UTILITY, or AUTHENTICATION");
        }

        // Convert buttons to JSON
        String buttonsJson = null;
        if (request.getButtons() != null && !request.getButtons().isEmpty()) {
            try {
                buttonsJson = objectMapper.writeValueAsString(request.getButtons());
            } catch (JsonProcessingException e) {
                throw new BadRequestException("Invalid buttons format");
            }
        }

        WhatsAppTemplate template = WhatsAppTemplate.builder()
                .account(account)
                .inbox(inbox)
                .name(request.getName().toLowerCase().replaceAll("[^a-z0-9_]", "_"))
                .language(request.getLanguage())
                .category(category)
                .body(request.getBody())
                .headerType(request.getHeaderType() != null ? request.getHeaderType() : "NONE")
                .headerText(request.getHeaderText())
                .footerText(request.getFooterText())
                .buttonsJson(buttonsJson)
                .bodyParamCount(bodyParamCount)
                .headerParamCount(headerParamCount)
                .status(WhatsAppTemplate.TemplateStatus.PENDING)
                .build();

        template = templateRepository.save(template);

        // Submit to Meta API
        submitToMeta(template, inbox);

        return WhatsAppTemplateResponse.fromEntity(template);
    }

    @Transactional
    public WhatsAppTemplateResponse updateTemplate(Long accountId, Long templateId, WhatsAppTemplateRequest request) {
        WhatsAppTemplate template = templateRepository.findByIdAndAccountId(templateId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));

        if (request.getBody() != null) {
            template.setBody(request.getBody());
            template.setBodyParamCount(countParameters(request.getBody()));
        }
        if (request.getHeaderType() != null) {
            template.setHeaderType(request.getHeaderType());
        }
        if (request.getHeaderText() != null) {
            template.setHeaderText(request.getHeaderText());
            template.setHeaderParamCount(countParameters(request.getHeaderText()));
        }
        if (request.getFooterText() != null) {
            template.setFooterText(request.getFooterText());
        }
        if (request.getCategory() != null) {
            try {
                template.setCategory(WhatsAppTemplate.TemplateCategory.valueOf(request.getCategory().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid category");
            }
        }
        if (request.getButtons() != null) {
            try {
                template.setButtonsJson(objectMapper.writeValueAsString(request.getButtons()));
            } catch (JsonProcessingException e) {
                throw new BadRequestException("Invalid buttons format");
            }
        }

        template = templateRepository.save(template);
        return WhatsAppTemplateResponse.fromEntity(template);
    }

    @Transactional
    public void deleteTemplate(Long accountId, Long templateId) {
        WhatsAppTemplate template = templateRepository.findByIdAndAccountId(templateId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));

        // Delete from Meta if it has an external ID
        if (template.getExternalId() != null) {
            try {
                deleteFromMeta(template);
            } catch (Exception e) {
                log.warn("Failed to delete template from Meta: {}", e.getMessage());
            }
        }

        templateRepository.delete(template);
    }

    // ========== Sync from Meta API ==========

    @Transactional
    public List<WhatsAppTemplateResponse> syncTemplates(Long accountId, Long inboxId) {
        Inbox inbox = inboxRepository.findByIdAndAccountId(inboxId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        if (inbox.getChannelType() != ChannelType.WHATSAPP) {
            throw new BadRequestException("Inbox is not a WhatsApp channel");
        }

        ChannelWhatsapp waConfig = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId()))
                .orElseThrow(() -> new ResourceNotFoundException("WhatsApp channel config not found"));

        Account account = inbox.getAccount();

        try {
            String wabaId = waConfig.getWabaId();
            if (wabaId == null || wabaId.isEmpty()) {
                throw new BadRequestException("WhatsApp Business Account ID (WABA ID) is required for template sync");
            }

            String url = waConfig.getApiBaseUrl() + "/" + wabaId + "/message_templates?limit=100";

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(waConfig.getAccessToken());
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BadRequestException("Meta API returned: " + response.getStatusCode());
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("data");

            if (!data.isArray()) {
                return Collections.emptyList();
            }

            List<WhatsAppTemplate> synced = new ArrayList<>();

            for (JsonNode tmpl : data) {
                String name = tmpl.path("name").asText();
                String lang = tmpl.path("language").asText("en_US");
                String statusStr = tmpl.path("status").asText("PENDING").toUpperCase();
                String categoryStr = tmpl.path("category").asText("MARKETING").toUpperCase();
                String externalId = tmpl.path("id").asText();

                // Parse components
                String body = "";
                String headerType = "NONE";
                String headerText = null;
                String footerText = null;
                String buttonsJson = null;

                JsonNode components = tmpl.path("components");
                if (components.isArray()) {
                    for (JsonNode comp : components) {
                        String compType = comp.path("type").asText().toUpperCase();
                        switch (compType) {
                            case "BODY":
                                body = comp.path("text").asText("");
                                break;
                            case "HEADER":
                                String format = comp.path("format").asText("TEXT");
                                headerType = format;
                                if ("TEXT".equals(format)) {
                                    headerText = comp.path("text").asText("");
                                }
                                break;
                            case "FOOTER":
                                footerText = comp.path("text").asText("");
                                break;
                            case "BUTTONS":
                                JsonNode buttons = comp.path("buttons");
                                if (buttons.isArray()) {
                                    buttonsJson = buttons.toString();
                                }
                                break;
                        }
                    }
                }

                WhatsAppTemplate.TemplateStatus status;
                try {
                    status = WhatsAppTemplate.TemplateStatus.valueOf(statusStr);
                } catch (IllegalArgumentException e) {
                    status = WhatsAppTemplate.TemplateStatus.PENDING;
                }

                WhatsAppTemplate.TemplateCategory category;
                try {
                    category = WhatsAppTemplate.TemplateCategory.valueOf(categoryStr);
                } catch (IllegalArgumentException e) {
                    category = WhatsAppTemplate.TemplateCategory.MARKETING;
                }

                // Upsert template
                WhatsAppTemplate template = templateRepository
                        .findByAccountIdAndInboxIdAndNameAndLanguage(accountId, inbox.getId(), name, lang)
                        .orElse(WhatsAppTemplate.builder()
                                .account(account)
                                .inbox(inbox)
                                .name(name)
                                .language(lang)
                                .build());

                template.setStatus(status);
                template.setCategory(category);
                template.setBody(body);
                template.setHeaderType(headerType);
                template.setHeaderText(headerText);
                template.setFooterText(footerText);
                template.setButtonsJson(buttonsJson);
                template.setBodyParamCount(countParameters(body));
                template.setHeaderParamCount("TEXT".equals(headerType) ? countParameters(headerText) : 0);
                template.setExternalId(externalId);

                // Parse rejection reason if rejected
                if (status == WhatsAppTemplate.TemplateStatus.REJECTED) {
                    String reason = tmpl.path("rejected_reason").asText(null);
                    template.setRejectionReason(reason);
                }

                synced.add(templateRepository.save(template));
            }

            log.info("Synced {} templates from Meta for inbox {} (account {})", synced.size(), inboxId, accountId);

            return synced.stream()
                    .map(WhatsAppTemplateResponse::fromEntity)
                    .collect(Collectors.toList());

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to sync templates from Meta: {}", e.getMessage());
            throw new BadRequestException("Failed to sync templates: " + e.getMessage());
        }
    }

    // ========== Send Template Message ==========

    @Transactional
    public void sendTemplate(Long accountId, Long conversationId, SendTemplateRequest request) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        WhatsAppTemplate template = templateRepository.findByIdAndAccountId(request.getTemplateId(), accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));

        if (template.getStatus() != WhatsAppTemplate.TemplateStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED templates can be sent. Current status: " + template.getStatus());
        }

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

            // Build template payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", contact.getPhoneNumber());
            payload.put("type", "template");

            Map<String, Object> templatePayload = new HashMap<>();
            templatePayload.put("name", template.getName());
            templatePayload.put("language", Map.of("code", template.getLanguage()));

            // Build components with parameters
            List<Map<String, Object>> components = new ArrayList<>();

            // Header parameters
            if (request.getHeaderParams() != null && !request.getHeaderParams().isEmpty()) {
                List<Map<String, Object>> headerParameters = new ArrayList<>();
                for (String param : request.getHeaderParams()) {
                    headerParameters.add(Map.of("type", "text", "text", param));
                }
                components.add(Map.of("type", "header", "parameters", headerParameters));
            }

            // Body parameters
            if (request.getBodyParams() != null && !request.getBodyParams().isEmpty()) {
                List<Map<String, Object>> bodyParameters = new ArrayList<>();
                for (String param : request.getBodyParams()) {
                    bodyParameters.add(Map.of("type", "text", "text", param));
                }
                components.add(Map.of("type", "body", "parameters", bodyParameters));
            }

            if (!components.isEmpty()) {
                templatePayload.put("components", components);
            }

            payload.put("template", templatePayload);

            HttpEntity<Map<String, Object>> httpRequest = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, httpRequest, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // Build the resolved message content for display
                String resolvedBody = resolveTemplateBody(template, request.getBodyParams());

                // Save outgoing message
                Message message = Message.builder()
                        .account(conv.getAccount())
                        .conversation(conv)
                        .inbox(inbox)
                        .content("[Template: " + template.getName() + "] " + resolvedBody)
                        .messageType(MessageType.OUTGOING)
                        .senderType(SenderType.USER)
                        .senderId(request.getSenderId())
                        .build();
                messageRepository.save(message);

                conv.setLastActivityAt(LocalDateTime.now());
                if (conv.getFirstReplyAt() == null) {
                    conv.setFirstReplyAt(LocalDateTime.now());
                }
                conversationRepository.save(conv);

                log.info("Template '{}' sent to {} in conversation #{}", template.getName(),
                        contact.getPhoneNumber(), conv.getDisplayId());
            } else {
                throw new BadRequestException("Meta API error: " + response.getStatusCode());
            }

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send template: {}", e.getMessage());
            throw new BadRequestException("Failed to send template: " + e.getMessage());
        }
    }

    // ========== Helpers ==========

    private int countParameters(String text) {
        if (text == null || text.isEmpty()) return 0;
        Pattern pattern = Pattern.compile("\\{\\{(\\d+)\\}\\}");
        Matcher matcher = pattern.matcher(text);
        Set<String> params = new HashSet<>();
        while (matcher.find()) {
            params.add(matcher.group(1));
        }
        return params.size();
    }

    private String resolveTemplateBody(WhatsAppTemplate template, List<String> params) {
        String body = template.getBody();
        if (body == null || params == null) return body != null ? body : "";
        for (int i = 0; i < params.size(); i++) {
            body = body.replace("{{" + (i + 1) + "}}", params.get(i));
        }
        return body;
    }

    private void submitToMeta(WhatsAppTemplate template, Inbox inbox) {
        try {
            ChannelWhatsapp waConfig = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId()))
                    .orElse(null);
            if (waConfig == null || waConfig.getWabaId() == null) {
                log.warn("Cannot submit template to Meta: WABA ID missing");
                return;
            }

            String url = waConfig.getApiBaseUrl() + "/" + waConfig.getWabaId() + "/message_templates";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(waConfig.getAccessToken());

            Map<String, Object> payload = new HashMap<>();
            payload.put("name", template.getName());
            payload.put("language", template.getLanguage());
            payload.put("category", template.getCategory().name());

            // Build components
            List<Map<String, Object>> components = new ArrayList<>();

            // Header
            if (!"NONE".equals(template.getHeaderType())) {
                Map<String, Object> header = new HashMap<>();
                header.put("type", "HEADER");
                header.put("format", template.getHeaderType());
                if ("TEXT".equals(template.getHeaderType()) && template.getHeaderText() != null) {
                    header.put("text", template.getHeaderText());
                }
                components.add(header);
            }

            // Body
            Map<String, Object> bodyComp = new HashMap<>();
            bodyComp.put("type", "BODY");
            bodyComp.put("text", template.getBody());
            components.add(bodyComp);

            // Footer
            if (template.getFooterText() != null && !template.getFooterText().isEmpty()) {
                components.add(Map.of("type", "FOOTER", "text", template.getFooterText()));
            }

            // Buttons
            if (template.getButtonsJson() != null) {
                try {
                    JsonNode buttons = objectMapper.readTree(template.getButtonsJson());
                    Map<String, Object> btnComp = new HashMap<>();
                    btnComp.put("type", "BUTTONS");
                    btnComp.put("buttons", objectMapper.readValue(template.getButtonsJson(), List.class));
                    components.add(btnComp);
                } catch (Exception e) {
                    log.warn("Failed to parse buttons JSON for template: {}", template.getName());
                }
            }

            payload.put("components", components);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode responseJson = objectMapper.readTree(response.getBody());
                String externalId = responseJson.path("id").asText(null);
                String status = responseJson.path("status").asText("PENDING");

                template.setExternalId(externalId);
                try {
                    template.setStatus(WhatsAppTemplate.TemplateStatus.valueOf(status.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    template.setStatus(WhatsAppTemplate.TemplateStatus.PENDING);
                }
                templateRepository.save(template);

                log.info("Template '{}' submitted to Meta. ID: {}, Status: {}", template.getName(), externalId, status);
            } else {
                log.error("Meta API error submitting template: {}", response.getBody());
            }

        } catch (Exception e) {
            log.error("Failed to submit template to Meta: {}", e.getMessage());
            // Don't throw — template is saved locally regardless
        }
    }

    private void deleteFromMeta(WhatsAppTemplate template) {
        Inbox inbox = template.getInbox();
        ChannelWhatsapp waConfig = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId()))
                .orElse(null);
        if (waConfig == null || waConfig.getWabaId() == null) return;

        String url = waConfig.getApiBaseUrl() + "/" + waConfig.getWabaId() +
                "/message_templates?name=" + template.getName();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(waConfig.getAccessToken());
        HttpEntity<Void> request = new HttpEntity<>(headers);

        restTemplate.exchange(url, HttpMethod.DELETE, request, String.class);
        log.info("Template '{}' deleted from Meta", template.getName());
    }
}
