package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "automation_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Event that triggers this rule:
     * conversation_created, conversation_updated, message_created
     */
    @Column(name = "event_name", nullable = false, length = 50)
    private String eventName;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Conditions as JSON array, e.g.:
     * [{"attribute":"status","operator":"equals","value":"open"},
     *  {"attribute":"inbox_id","operator":"equals","value":"1"}]
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private List<RuleCondition> conditions = new ArrayList<>();

    /**
     * Actions as JSON array, e.g.:
     * [{"type":"assign_agent","value":"5"},
     *  {"type":"add_label","value":"urgent"},
     *  {"type":"send_message","value":"Thanks for reaching out!"}]
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private List<RuleAction> actions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RuleCondition {
        private String attribute;  // status, inbox_id, message_content, contact_email, team_id
        private String operator;   // equals, not_equals, contains, not_contains
        private String value;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RuleAction {
        private String type;   // assign_agent, assign_team, add_label, send_message, change_status
        private String value;
    }
}
