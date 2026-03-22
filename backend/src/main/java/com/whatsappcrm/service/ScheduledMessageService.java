package com.whatsappcrm.service;

import com.whatsappcrm.dto.ScheduledMessageRequest;
import com.whatsappcrm.dto.ScheduledMessageResponse;
import com.whatsappcrm.entity.*;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledMessageService {

    private final ScheduledMessageRepository scheduledMessageRepository;
    private final AccountRepository accountRepository;
    private final InboxRepository inboxRepository;
    private final ContactRepository contactRepository;
    private final WhatsAppTemplateRepository templateRepository;
    private final BroadcastRepository broadcastRepository;

    public List<ScheduledMessageResponse> getScheduledMessages(Long accountId) {
        return scheduledMessageRepository.findByAccountIdOrderByScheduledAtAsc(accountId).stream()
                .map(ScheduledMessageResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public ScheduledMessageResponse getScheduledMessage(Long accountId, Long id) {
        ScheduledMessage sm = scheduledMessageRepository.findByIdAndAccountId(id, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled message not found"));
        return ScheduledMessageResponse.fromEntity(sm);
    }

    @Transactional
    public ScheduledMessageResponse createScheduledMessage(Long accountId, ScheduledMessageRequest request, Long userId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        Inbox inbox = inboxRepository.findByIdAndAccountId(request.getInboxId(), accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        ScheduledMessage.ScheduleType type;
        try {
            type = ScheduledMessage.ScheduleType.valueOf(request.getScheduleType().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid schedule type: " + request.getScheduleType());
        }

        LocalDateTime scheduledAt;
        try {
            scheduledAt = LocalDateTime.parse(request.getScheduledAt());
        } catch (Exception e) {
            throw new BadRequestException("Invalid scheduledAt format. Use ISO format: 2026-03-23T10:00:00");
        }

        if (scheduledAt.isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Scheduled time must be in the future");
        }

        ScheduledMessage sm = ScheduledMessage.builder()
                .account(account)
                .inbox(inbox)
                .scheduleType(type)
                .scheduledAt(scheduledAt)
                .label(request.getLabel())
                .createdBy(userId)
                .build();

        switch (type) {
            case DIRECT:
                if (request.getContactId() == null) {
                    throw new BadRequestException("Contact is required for DIRECT messages");
                }
                if (request.getContent() == null || request.getContent().isBlank()) {
                    throw new BadRequestException("Content is required for DIRECT messages");
                }
                Contact directContact = contactRepository.findByIdAndAccountId(request.getContactId(), accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
                if (directContact.getPhoneNumber() == null || directContact.getPhoneNumber().isBlank()) {
                    throw new BadRequestException("Contact must have a phone number");
                }
                sm.setContact(directContact);
                sm.setContent(request.getContent());
                break;

            case TEMPLATE:
                if (request.getContactId() == null) {
                    throw new BadRequestException("Contact is required for TEMPLATE messages");
                }
                if (request.getTemplateId() == null) {
                    throw new BadRequestException("Template is required for TEMPLATE messages");
                }
                Contact templateContact = contactRepository.findByIdAndAccountId(request.getContactId(), accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
                if (templateContact.getPhoneNumber() == null || templateContact.getPhoneNumber().isBlank()) {
                    throw new BadRequestException("Contact must have a phone number");
                }
                WhatsAppTemplate template = templateRepository.findByIdAndAccountId(request.getTemplateId(), accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
                if (template.getStatus() != WhatsAppTemplate.TemplateStatus.APPROVED) {
                    throw new BadRequestException("Only APPROVED templates can be scheduled");
                }
                sm.setContact(templateContact);
                sm.setTemplate(template);
                if (request.getBodyParams() != null && !request.getBodyParams().isEmpty()) {
                    Map<String, Object> params = new HashMap<>();
                    params.put("bodyParams", request.getBodyParams());
                    sm.setTemplateParams(params);
                }
                break;

            case BROADCAST:
                if (request.getBroadcastId() == null) {
                    throw new BadRequestException("Broadcast is required for BROADCAST schedules");
                }
                Broadcast broadcast = broadcastRepository.findByIdAndAccountId(request.getBroadcastId(), accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Broadcast not found"));
                if (broadcast.getStatus() != Broadcast.BroadcastStatus.DRAFT &&
                        broadcast.getStatus() != Broadcast.BroadcastStatus.SCHEDULED) {
                    throw new BadRequestException("Broadcast must be in DRAFT or SCHEDULED status to schedule");
                }
                sm.setBroadcast(broadcast);
                // Also update the broadcast itself
                broadcast.setScheduledAt(scheduledAt);
                broadcast.setStatus(Broadcast.BroadcastStatus.SCHEDULED);
                broadcastRepository.save(broadcast);
                break;
        }

        sm = scheduledMessageRepository.save(sm);
        log.info("Scheduled message created: id={}, type={}, scheduledAt={}", sm.getId(), type, scheduledAt);
        return ScheduledMessageResponse.fromEntity(sm);
    }

    @Transactional
    public ScheduledMessageResponse updateScheduledMessage(Long accountId, Long id, ScheduledMessageRequest request) {
        ScheduledMessage sm = scheduledMessageRepository.findByIdAndAccountId(id, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled message not found"));

        if (sm.getStatus() != ScheduledMessage.ScheduleStatus.PENDING) {
            throw new BadRequestException("Can only update PENDING scheduled messages");
        }

        if (request.getScheduledAt() != null) {
            LocalDateTime scheduledAt = LocalDateTime.parse(request.getScheduledAt());
            if (scheduledAt.isBefore(LocalDateTime.now())) {
                throw new BadRequestException("Scheduled time must be in the future");
            }
            sm.setScheduledAt(scheduledAt);

            // Update linked broadcast if applicable
            if (sm.getBroadcast() != null) {
                sm.getBroadcast().setScheduledAt(scheduledAt);
                broadcastRepository.save(sm.getBroadcast());
            }
        }

        if (request.getContent() != null) {
            sm.setContent(request.getContent());
        }
        if (request.getLabel() != null) {
            sm.setLabel(request.getLabel());
        }
        if (request.getBodyParams() != null) {
            Map<String, Object> params = new HashMap<>();
            params.put("bodyParams", request.getBodyParams());
            sm.setTemplateParams(params);
        }

        sm = scheduledMessageRepository.save(sm);
        return ScheduledMessageResponse.fromEntity(sm);
    }

    @Transactional
    public void cancelScheduledMessage(Long accountId, Long id) {
        ScheduledMessage sm = scheduledMessageRepository.findByIdAndAccountId(id, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled message not found"));

        if (sm.getStatus() != ScheduledMessage.ScheduleStatus.PENDING) {
            throw new BadRequestException("Can only cancel PENDING scheduled messages");
        }

        sm.setStatus(ScheduledMessage.ScheduleStatus.CANCELLED);
        scheduledMessageRepository.save(sm);

        // If broadcast, revert to DRAFT
        if (sm.getBroadcast() != null) {
            Broadcast broadcast = sm.getBroadcast();
            if (broadcast.getStatus() == Broadcast.BroadcastStatus.SCHEDULED) {
                broadcast.setStatus(Broadcast.BroadcastStatus.DRAFT);
                broadcast.setScheduledAt(null);
                broadcastRepository.save(broadcast);
            }
        }

        log.info("Scheduled message cancelled: id={}", id);
    }

    @Transactional
    public void deleteScheduledMessage(Long accountId, Long id) {
        ScheduledMessage sm = scheduledMessageRepository.findByIdAndAccountId(id, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled message not found"));

        if (sm.getStatus() == ScheduledMessage.ScheduleStatus.PROCESSING) {
            throw new BadRequestException("Cannot delete a message being processed");
        }

        scheduledMessageRepository.delete(sm);
    }
}
