package com.whatsappcrm.entity;

import com.whatsappcrm.enums.MessageType;
import com.whatsappcrm.enums.SenderType;
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
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inbox_id", nullable = false)
    private Inbox inbox;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false)
    private MessageType messageType;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type")
    private SenderType senderType;

    @Column(name = "sender_id")
    private Long senderId;

    @Column(name = "private_flag", nullable = false)
    @Builder.Default
    private Boolean privateFlag = false;

    @Column(name = "external_id")
    private String externalId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content_attributes", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> contentAttributes = new HashMap<>();

    @Column(name = "delivery_status")
    @Builder.Default
    private String deliveryStatus = "sent";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
