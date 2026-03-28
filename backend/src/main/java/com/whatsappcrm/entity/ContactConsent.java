package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Tracks WhatsApp messaging consent per contact.
 * Maintains a full audit trail of opt-in / opt-out events.
 */
@Entity
@Table(name = "contact_consents", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"account_id", "contact_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactConsent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    /**
     * Current consent status.
     * OPT_IN: contact has consented to receive messages
     * OPT_OUT: contact has opted out (STOP message or manual)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ConsentStatus status = ConsentStatus.OPT_IN;

    /**
     * How the current status was set.
     * AUTO_KEYWORD: detected via STOP/START keyword
     * MANUAL: agent/admin changed it manually
     * IMPORT: set during contact import
     * API: set via external API
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    @Builder.Default
    private ConsentSource source = ConsentSource.IMPORT;

    /**
     * The keyword that triggered the status change (e.g., "STOP", "UNSUBSCRIBE", "START")
     */
    @Column(name = "trigger_keyword")
    private String triggerKeyword;

    @Column(name = "opted_in_at")
    private LocalDateTime optedInAt;

    @Column(name = "opted_out_at")
    private LocalDateTime optedOutAt;

    /**
     * Optional note for manual changes
     */
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "updated_by")
    private Long updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum ConsentStatus {
        OPT_IN, OPT_OUT
    }

    public enum ConsentSource {
        AUTO_KEYWORD, MANUAL, IMPORT, API
    }
}
