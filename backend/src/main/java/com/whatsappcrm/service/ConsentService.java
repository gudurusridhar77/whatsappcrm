package com.whatsappcrm.service;

import com.whatsappcrm.dto.ConsentResponse;
import com.whatsappcrm.dto.ConsentUpdateRequest;
import com.whatsappcrm.entity.*;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsentService {

    private final ContactConsentRepository consentRepository;
    private final ConsentAuditLogRepository auditLogRepository;
    private final ContactRepository contactRepository;
    private final AccountRepository accountRepository;

    /**
     * Opt-out keywords. Case-insensitive matching.
     * These are the standard WhatsApp/SMS opt-out keywords.
     */
    private static final Set<String> OPT_OUT_KEYWORDS = Set.of(
            "stop", "unsubscribe", "cancel", "quit", "opt out", "optout",
            "opt-out", "remove", "end", "no more"
    );

    /**
     * Opt-in keywords. Case-insensitive matching.
     */
    private static final Set<String> OPT_IN_KEYWORDS = Set.of(
            "start", "subscribe", "opt in", "optin", "opt-in", "resume", "yes"
    );

    /**
     * Auto-reply message sent when a contact opts out.
     */
    private static final String OPT_OUT_REPLY = "You have been unsubscribed and will no longer receive marketing messages from us. Reply START to re-subscribe.";

    /**
     * Auto-reply message sent when a contact opts back in.
     */
    private static final String OPT_IN_REPLY = "Welcome back! You have been re-subscribed and will receive messages from us. Reply STOP to unsubscribe at any time.";

    // ============================
    // Automatic keyword detection
    // ============================

    /**
     * Check if an incoming message is an opt-out or opt-in keyword.
     * Called from WhatsAppChannelService for every incoming message.
     *
     * @return auto-reply text if consent changed, null otherwise
     */
    @Transactional
    public String processIncomingForConsent(Long accountId, Contact contact, String messageContent) {
        if (messageContent == null || messageContent.isBlank()) return null;

        String trimmed = messageContent.trim().toLowerCase();

        if (OPT_OUT_KEYWORDS.contains(trimmed)) {
            return handleOptOut(accountId, contact, trimmed, ContactConsent.ConsentSource.AUTO_KEYWORD);
        }

        if (OPT_IN_KEYWORDS.contains(trimmed)) {
            return handleOptIn(accountId, contact, trimmed, ContactConsent.ConsentSource.AUTO_KEYWORD);
        }

        return null; // not a consent keyword
    }

    private String handleOptOut(Long accountId, Contact contact, String keyword, ContactConsent.ConsentSource source) {
        ContactConsent consent = getOrCreateConsent(accountId, contact);

        if (consent.getStatus() == ContactConsent.ConsentStatus.OPT_OUT) {
            log.debug("Contact {} already opted out, ignoring duplicate", contact.getId());
            return null; // already opted out
        }

        ContactConsent.ConsentStatus previousStatus = consent.getStatus();

        consent.setStatus(ContactConsent.ConsentStatus.OPT_OUT);
        consent.setSource(source);
        consent.setTriggerKeyword(keyword);
        consent.setOptedOutAt(LocalDateTime.now());
        consentRepository.save(consent);

        // Audit log
        createAuditLog(accountId, contact, previousStatus, ContactConsent.ConsentStatus.OPT_OUT,
                source, keyword, "Contact opted out via keyword: " + keyword, null);

        log.info("Contact {} (phone: {}) opted OUT for account {}", contact.getId(), contact.getPhoneNumber(), accountId);
        return OPT_OUT_REPLY;
    }

    private String handleOptIn(Long accountId, Contact contact, String keyword, ContactConsent.ConsentSource source) {
        ContactConsent consent = getOrCreateConsent(accountId, contact);

        if (consent.getStatus() == ContactConsent.ConsentStatus.OPT_IN) {
            log.debug("Contact {} already opted in, ignoring duplicate", contact.getId());
            return null; // already opted in
        }

        ContactConsent.ConsentStatus previousStatus = consent.getStatus();

        consent.setStatus(ContactConsent.ConsentStatus.OPT_IN);
        consent.setSource(source);
        consent.setTriggerKeyword(keyword);
        consent.setOptedInAt(LocalDateTime.now());
        consentRepository.save(consent);

        // Audit log
        createAuditLog(accountId, contact, previousStatus, ContactConsent.ConsentStatus.OPT_IN,
                source, keyword, "Contact opted in via keyword: " + keyword, null);

        log.info("Contact {} (phone: {}) opted IN for account {}", contact.getId(), contact.getPhoneNumber(), accountId);
        return OPT_IN_REPLY;
    }

    // ============================
    // Check consent status
    // ============================

    /**
     * Check if a contact is opted out and should NOT receive messages.
     */
    public boolean isOptedOut(Long accountId, Long contactId) {
        return consentRepository.isOptedOut(accountId, contactId);
    }

    /**
     * Check if a contact can receive messages (opted in or no consent record = default opted in).
     */
    public boolean canSendMessage(Long accountId, Long contactId) {
        return !isOptedOut(accountId, contactId);
    }

    // ============================
    // Manual consent management
    // ============================

    public List<ConsentResponse> getAllConsents(Long accountId) {
        return consentRepository.findAllWithContactByAccountId(accountId).stream()
                .map(ConsentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public List<ConsentResponse> getConsentsByStatus(Long accountId, String status) {
        ContactConsent.ConsentStatus consentStatus;
        try {
            consentStatus = ContactConsent.ConsentStatus.valueOf(status.toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid status: " + status + ". Use OPT_IN or OPT_OUT");
        }
        return consentRepository.findAllWithContactByAccountIdAndStatus(accountId, consentStatus).stream()
                .map(ConsentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public ConsentResponse.ConsentDetailResponse getConsentDetail(Long accountId, Long contactId) {
        Contact contact = contactRepository.findByIdAndAccountId(contactId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));

        ContactConsent consent = consentRepository.findByAccountIdAndContactId(accountId, contactId)
                .orElse(null);

        ConsentResponse consentResponse = consent != null
                ? ConsentResponse.fromEntity(consent)
                : ConsentResponse.builder()
                        .contactId(contact.getId())
                        .contactName(contact.getName())
                        .contactPhone(contact.getPhoneNumber())
                        .contactEmail(contact.getEmail())
                        .status("OPT_IN")
                        .source("IMPORT")
                        .build();

        List<ConsentResponse.AuditEntry> auditTrail = auditLogRepository
                .findByAccountIdAndContactIdOrderByCreatedAtDesc(accountId, contactId).stream()
                .map(ConsentResponse.AuditEntry::fromEntity)
                .collect(Collectors.toList());

        return ConsentResponse.ConsentDetailResponse.builder()
                .consent(consentResponse)
                .auditTrail(auditTrail)
                .build();
    }

    @Transactional
    public ConsentResponse updateConsent(Long accountId, Long contactId, ConsentUpdateRequest request, Long userId) {
        Contact contact = contactRepository.findByIdAndAccountId(contactId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));

        ContactConsent.ConsentStatus newStatus;
        try {
            newStatus = ContactConsent.ConsentStatus.valueOf(request.getStatus().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid status: " + request.getStatus() + ". Use OPT_IN or OPT_OUT");
        }

        ContactConsent consent = getOrCreateConsent(accountId, contact);
        ContactConsent.ConsentStatus previousStatus = consent.getStatus();

        if (previousStatus == newStatus) {
            return ConsentResponse.fromEntity(consent); // no change
        }

        consent.setStatus(newStatus);
        consent.setSource(ContactConsent.ConsentSource.MANUAL);
        consent.setTriggerKeyword(null);
        consent.setNotes(request.getNotes());
        consent.setUpdatedBy(userId);

        if (newStatus == ContactConsent.ConsentStatus.OPT_IN) {
            consent.setOptedInAt(LocalDateTime.now());
        } else {
            consent.setOptedOutAt(LocalDateTime.now());
        }

        consentRepository.save(consent);

        createAuditLog(accountId, contact, previousStatus, newStatus,
                ContactConsent.ConsentSource.MANUAL, null,
                request.getNotes() != null ? request.getNotes() : "Manual status change by agent",
                userId);

        log.info("Consent manually updated for contact {}: {} -> {} by user {}",
                contactId, previousStatus, newStatus, userId);

        return ConsentResponse.fromEntity(consent);
    }

    @Transactional
    public ConsentResponse.ConsentStats getStats(Long accountId) {
        long optedIn = consentRepository.countByAccountIdAndStatus(accountId, ContactConsent.ConsentStatus.OPT_IN);
        long optedOut = consentRepository.countByAccountIdAndStatus(accountId, ContactConsent.ConsentStatus.OPT_OUT);
        long total = optedIn + optedOut;
        double optInRate = total > 0 ? (double) optedIn / total * 100 : 100.0;

        return ConsentResponse.ConsentStats.builder()
                .totalContacts(total)
                .optedIn(optedIn)
                .optedOut(optedOut)
                .optInRate(Math.round(optInRate * 10.0) / 10.0)
                .build();
    }

    /**
     * Bulk opt-out contacts (e.g., from compliance request)
     */
    @Transactional
    public int bulkOptOut(Long accountId, List<Long> contactIds, String notes, Long userId) {
        int count = 0;
        for (Long contactId : contactIds) {
            Contact contact = contactRepository.findByIdAndAccountId(contactId, accountId).orElse(null);
            if (contact == null) continue;

            ContactConsent consent = getOrCreateConsent(accountId, contact);
            if (consent.getStatus() == ContactConsent.ConsentStatus.OPT_OUT) continue;

            ContactConsent.ConsentStatus prev = consent.getStatus();
            consent.setStatus(ContactConsent.ConsentStatus.OPT_OUT);
            consent.setSource(ContactConsent.ConsentSource.MANUAL);
            consent.setOptedOutAt(LocalDateTime.now());
            consent.setNotes(notes);
            consent.setUpdatedBy(userId);
            consentRepository.save(consent);

            createAuditLog(accountId, contact, prev, ContactConsent.ConsentStatus.OPT_OUT,
                    ContactConsent.ConsentSource.MANUAL, null,
                    notes != null ? notes : "Bulk opt-out", userId);
            count++;
        }
        log.info("Bulk opt-out: {} contacts opted out for account {}", count, accountId);
        return count;
    }

    // ============================
    // Helpers
    // ============================

    private ContactConsent getOrCreateConsent(Long accountId, Contact contact) {
        return consentRepository.findByAccountIdAndContactId(accountId, contact.getId())
                .orElseGet(() -> {
                    Account account = accountRepository.findById(accountId)
                            .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
                    ContactConsent newConsent = ContactConsent.builder()
                            .account(account)
                            .contact(contact)
                            .status(ContactConsent.ConsentStatus.OPT_IN)
                            .source(ContactConsent.ConsentSource.IMPORT)
                            .optedInAt(LocalDateTime.now())
                            .build();
                    return consentRepository.save(newConsent);
                });
    }

    private void createAuditLog(Long accountId, Contact contact,
                                 ContactConsent.ConsentStatus previousStatus,
                                 ContactConsent.ConsentStatus newStatus,
                                 ContactConsent.ConsentSource source,
                                 String triggerKeyword, String notes, Long performedBy) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        ConsentAuditLog log = ConsentAuditLog.builder()
                .account(account)
                .contact(contact)
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .source(source)
                .triggerKeyword(triggerKeyword)
                .notes(notes)
                .performedBy(performedBy)
                .build();
        auditLogRepository.save(log);
    }
}
