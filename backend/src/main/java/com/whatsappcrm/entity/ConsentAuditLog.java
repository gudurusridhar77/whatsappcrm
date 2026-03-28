package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Immutable audit trail for every consent change.
 * Critical for WhatsApp compliance — proves consent history.
 */
@Entity
@Table(name = "consent_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsentAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status")
    private ContactConsent.ConsentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private ContactConsent.ConsentStatus newStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContactConsent.ConsentSource source;

    @Column(name = "trigger_keyword")
    private String triggerKeyword;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "performed_by")
    private Long performedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
