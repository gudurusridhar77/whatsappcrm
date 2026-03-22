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
@Table(name = "broadcasts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Broadcast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inbox_id", nullable = false)
    private Inbox inbox;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private WhatsAppTemplate template;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BroadcastStatus status = BroadcastStatus.DRAFT;

    // Total contacts targeted
    @Column(name = "total_count")
    @Builder.Default
    private Integer totalCount = 0;

    // Sent count
    @Column(name = "sent_count")
    @Builder.Default
    private Integer sentCount = 0;

    // Delivered count
    @Column(name = "delivered_count")
    @Builder.Default
    private Integer deliveredCount = 0;

    // Read count
    @Column(name = "read_count")
    @Builder.Default
    private Integer readCount = 0;

    // Failed count
    @Column(name = "failed_count")
    @Builder.Default
    private Integer failedCount = 0;

    // Replied count
    @Column(name = "replied_count")
    @Builder.Default
    private Integer repliedCount = 0;

    // Contact filter labels/tags (comma-separated, or null for all)
    @Column(name = "contact_filter")
    private String contactFilter;

    // Template parameter values (JSON: [["John","ORD123"],["Jane","ORD456"]])
    // If empty, template is sent without params
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_params", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> defaultParams = new HashMap<>();

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum BroadcastStatus {
        DRAFT, SCHEDULED, PROCESSING, COMPLETED, FAILED, CANCELLED
    }
}
