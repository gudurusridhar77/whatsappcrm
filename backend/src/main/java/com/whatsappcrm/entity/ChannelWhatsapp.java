package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "channel_whatsapps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelWhatsapp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Meta Business API Configuration
    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    @Column(name = "phone_number_id", nullable = false)
    private String phoneNumberId;

    @Column(name = "waba_id")
    private String wabaId; // WhatsApp Business Account ID

    @Column(name = "access_token", nullable = false, columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "webhook_verify_token")
    @Builder.Default
    private String webhookVerifyToken = java.util.UUID.randomUUID().toString();

    @Column(name = "api_base_url")
    @Builder.Default
    private String apiBaseUrl = "https://graph.facebook.com/v21.0";

    @Column(name = "business_name")
    private String businessName;

    // Status
    @Column(name = "provider")
    @Builder.Default
    private String provider = "whatsapp_cloud"; // whatsapp_cloud or 360dialog, etc.

    @Column(name = "message_templates_enabled")
    @Builder.Default
    private Boolean messageTemplatesEnabled = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
