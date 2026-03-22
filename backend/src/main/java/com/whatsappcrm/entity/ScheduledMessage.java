package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "scheduled_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inbox_id", nullable = false)
    private Inbox inbox;

    /**
     * Schedule type:
     * - DIRECT: send a single message to a contact via WhatsApp
     * - TEMPLATE: send a template message to a contact via WhatsApp
     * - BROADCAST: fire a broadcast at scheduled time (links to Broadcast entity)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", nullable = false)
    private ScheduleType scheduleType;

    // For DIRECT / TEMPLATE messages
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private Contact contact;

    // For DIRECT messages: plain text content
    @Column(columnDefinition = "TEXT")
    private String content;

    // For TEMPLATE messages
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private WhatsAppTemplate template;

    // Template parameters (JSON list of strings)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "template_params", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> templateParams = new HashMap<>();

    // For BROADCAST type: link to existing broadcast
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "broadcast_id")
    private Broadcast broadcast;

    // When to send
    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ScheduleStatus status = ScheduleStatus.PENDING;

    @Column(name = "failure_reason")
    private String failureReason;

    // Optional label/note for the scheduled item
    private String label;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ScheduleType {
        DIRECT, TEMPLATE, BROADCAST
    }

    public enum ScheduleStatus {
        PENDING, PROCESSING, SENT, FAILED, CANCELLED
    }
}
