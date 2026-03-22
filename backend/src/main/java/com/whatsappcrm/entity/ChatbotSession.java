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

/**
 * Tracks the state of a chatbot flow execution for a specific conversation.
 * Each conversation can have at most one active chatbot session.
 */
@Entity
@Table(name = "chatbot_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatbotSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chatbot_flow_id", nullable = false)
    private ChatbotFlow chatbotFlow;

    /**
     * The ID of the current node in the flow where the session is waiting.
     * null means the flow hasn't started yet.
     */
    @Column(name = "current_node_id")
    private String currentNodeId;

    /**
     * Session status:
     * ACTIVE - Flow is running, waiting for user input or processing
     * COMPLETED - Flow reached an end node
     * HANDED_OFF - Flow handed off to a human agent
     * EXPIRED - Session timed out
     */
    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    /**
     * Variables collected during the flow (name, email, chosen options, etc.)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "session_data", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> sessionData = new HashMap<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
