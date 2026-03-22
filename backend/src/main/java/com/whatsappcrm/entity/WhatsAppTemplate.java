package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "whatsapp_templates", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"account_id", "name", "language"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inbox_id", nullable = false)
    private Inbox inbox;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private String language = "en_US";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TemplateStatus status = TemplateStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TemplateCategory category = TemplateCategory.MARKETING;

    // The body text of the template (with {{1}}, {{2}} placeholders)
    @Column(columnDefinition = "TEXT")
    private String body;

    // Header type: NONE, TEXT, IMAGE, VIDEO, DOCUMENT
    @Column(name = "header_type")
    @Builder.Default
    private String headerType = "NONE";

    // Header text content (if header_type is TEXT)
    @Column(name = "header_text")
    private String headerText;

    // Footer text
    @Column(name = "footer_text")
    private String footerText;

    // Buttons JSON: [{type:"QUICK_REPLY",text:"Yes"}, {type:"URL",text:"Visit",url:"https://..."}]
    @Column(name = "buttons_json", columnDefinition = "TEXT")
    private String buttonsJson;

    // Number of parameters/variables in the body (e.g., {{1}}, {{2}})
    @Column(name = "body_param_count")
    @Builder.Default
    private Integer bodyParamCount = 0;

    // Number of header parameters
    @Column(name = "header_param_count")
    @Builder.Default
    private Integer headerParamCount = 0;

    // Meta template ID (from sync)
    @Column(name = "external_id")
    private String externalId;

    // Rejection reason from Meta
    @Column(name = "rejection_reason")
    private String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum TemplateStatus {
        APPROVED, PENDING, REJECTED, PAUSED, DISABLED, DELETED
    }

    public enum TemplateCategory {
        MARKETING, UTILITY, AUTHENTICATION
    }
}
