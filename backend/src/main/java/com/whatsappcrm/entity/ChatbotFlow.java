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
import java.util.Map;

@Entity
@Table(name = "chatbot_flows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatbotFlow {

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
     * Which inbox this flow applies to. If null, applies to all inboxes.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inbox_id")
    private Inbox inbox;

    /**
     * Trigger type determines when this flow activates:
     * - CONVERSATION_CREATED: When a new conversation is created
     * - KEYWORD: When incoming message matches a keyword
     * - WELCOME: Fires on first message of a new conversation
     */
    @Column(name = "trigger_type", nullable = false)
    @Builder.Default
    private String triggerType = "WELCOME";

    /**
     * Keywords that trigger this flow (comma-separated). Only used when triggerType = KEYWORD.
     */
    @Column(name = "trigger_keywords")
    private String triggerKeywords;

    /**
     * The flow graph data - nodes and edges stored as JSON.
     * Structure: { nodes: [...], edges: [...] }
     * Each node: { id, type, position: {x,y}, data: { label, message, options, ... } }
     * Each edge: { id, source, target, sourceHandle }
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "flow_data", columnDefinition = "jsonb")
    private Map<String, Object> flowData;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = false;

    /**
     * Priority when multiple flows could match (lower = higher priority)
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 100;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
