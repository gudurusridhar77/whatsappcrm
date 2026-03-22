package com.whatsappcrm.entity;

import com.whatsappcrm.enums.ChannelType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "inboxes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false)
    private ChannelType channelType;

    @Column(name = "channel_id")
    private String channelId;

    @Column(nullable = false, updatable = false, unique = true)
    @Builder.Default
    private String token = UUID.randomUUID().toString();

    @Column(name = "greeting_enabled")
    @Builder.Default
    private Boolean greetingEnabled = false;

    @Column(name = "greeting_message", columnDefinition = "TEXT")
    private String greetingMessage;

    @Column(name = "enable_auto_assignment")
    @Builder.Default
    private Boolean enableAutoAssignment = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> settings = new HashMap<>();

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
