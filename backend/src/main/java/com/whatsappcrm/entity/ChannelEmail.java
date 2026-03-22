package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "channel_emails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email_address", nullable = false)
    private String emailAddress;

    // IMAP settings (receiving)
    @Column(name = "imap_enabled")
    @Builder.Default
    private Boolean imapEnabled = false;

    @Column(name = "imap_host")
    private String imapHost;

    @Column(name = "imap_port")
    @Builder.Default
    private Integer imapPort = 993;

    @Column(name = "imap_username")
    private String imapUsername;

    @Column(name = "imap_password")
    private String imapPassword;

    @Column(name = "imap_ssl")
    @Builder.Default
    private Boolean imapSsl = true;

    // SMTP settings (sending)
    @Column(name = "smtp_enabled")
    @Builder.Default
    private Boolean smtpEnabled = false;

    @Column(name = "smtp_host")
    private String smtpHost;

    @Column(name = "smtp_port")
    @Builder.Default
    private Integer smtpPort = 587;

    @Column(name = "smtp_username")
    private String smtpUsername;

    @Column(name = "smtp_password")
    private String smtpPassword;

    @Column(name = "smtp_authentication")
    @Builder.Default
    private Boolean smtpAuthentication = true;

    @Column(name = "smtp_tls")
    @Builder.Default
    private Boolean smtpTls = true;

    // Forwarding (simpler setup - just forward emails to this address)
    @Column(name = "forward_to_email")
    private String forwardToEmail;

    @Column(name = "signature", columnDefinition = "TEXT")
    private String signature;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
