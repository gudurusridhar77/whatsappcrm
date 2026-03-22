package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "channel_web_widgets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelWebWidget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "website_url")
    private String websiteUrl;

    @Column(name = "welcome_title")
    @Builder.Default
    private String welcomeTitle = "Hi there!";

    @Column(name = "welcome_tagline")
    @Builder.Default
    private String welcomeTagline = "We make it simple to connect with us. Ask us anything.";

    @Column(name = "widget_color")
    @Builder.Default
    private String widgetColor = "#1b72e8";

    @Column(name = "reply_time")
    @Builder.Default
    private String replyTime = "in a few minutes";

    @Column(name = "pre_chat_form_enabled")
    @Builder.Default
    private Boolean preChatFormEnabled = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
