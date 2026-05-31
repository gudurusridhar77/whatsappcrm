package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A browser/PWA Web Push subscription belonging to a user.
 * One user can have several (one per device/browser).
 */
@Entity
@Table(name = "push_subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // The push service endpoint URL (unique per subscription).
    @Column(name = "endpoint", nullable = false, unique = true, length = 1000)
    private String endpoint;

    // Client public key (base64url) used to encrypt the payload.
    @Column(name = "p256dh", nullable = false, length = 255)
    private String p256dh;

    // Client auth secret (base64url).
    @Column(name = "auth", nullable = false, length = 255)
    private String auth;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
