package com.whatsappcrm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.whatsappcrm.entity.PushSubscription;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.List;
import java.util.Map;

/**
 * Sends Web Push (VAPID) notifications to subscribed browsers/PWAs.
 * Gracefully no-ops when VAPID keys aren't configured.
 */
@Service
@Slf4j
public class WebPushService {

    private final PushSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    private final String publicKey;
    private final String privateKey;
    private final String subject;

    private PushService pushService; // null => disabled

    public WebPushService(PushSubscriptionRepository subscriptionRepository,
                          ObjectMapper objectMapper,
                          @Value("${app.webpush.public-key:}") String publicKey,
                          @Value("${app.webpush.private-key:}") String privateKey,
                          @Value("${app.webpush.subject:mailto:admin@example.com}") String subject) {
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.subject = subject;
    }

    @PostConstruct
    void init() {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (StringUtils.hasText(publicKey) && StringUtils.hasText(privateKey)) {
            try {
                this.pushService = new PushService(publicKey, privateKey, subject);
                log.info("Web Push enabled (VAPID configured)");
            } catch (Exception e) {
                log.error("Failed to initialise Web Push: {}", e.getMessage());
            }
        } else {
            log.info("Web Push disabled (no VAPID keys configured)");
        }
    }

    public boolean isEnabled() {
        return pushService != null;
    }

    public String getPublicKey() {
        return publicKey;
    }

    @Transactional
    public void saveSubscription(User user, String endpoint, String p256dh, String auth) {
        PushSubscription sub = subscriptionRepository.findByEndpoint(endpoint)
                .orElseGet(PushSubscription::new);
        sub.setUser(user);
        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(auth);
        subscriptionRepository.save(sub);
    }

    @Transactional
    public void removeSubscription(String endpoint) {
        subscriptionRepository.deleteByEndpoint(endpoint);
    }

    /** Send a notification to every device the user has subscribed. */
    public void sendToUser(Long userId, String title, String body, String url) {
        if (pushService == null) return;
        List<PushSubscription> subs = subscriptionRepository.findByUserId(userId);
        if (subs.isEmpty()) return;

        final String payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of(
                    "title", title == null ? "" : title,
                    "body", body == null ? "" : body,
                    "url", url == null ? "/" : url
            ));
        } catch (Exception e) {
            log.warn("Failed to build push payload: {}", e.getMessage());
            return;
        }

        for (PushSubscription sub : subs) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(), sub.getP256dh(), sub.getAuth(),
                        payload.getBytes(StandardCharsets.UTF_8));
                HttpResponse response = pushService.send(notification);
                int code = response.getStatusLine().getStatusCode();
                if (code == 404 || code == 410) {
                    // Gone/expired — clean up so we stop trying.
                    removeSubscription(sub.getEndpoint());
                    log.info("Removed stale push subscription (HTTP {})", code);
                } else if (code >= 400) {
                    log.warn("Web push send returned HTTP {}", code);
                }
            } catch (Exception e) {
                log.warn("Failed to send web push: {}", e.getMessage());
            }
        }
    }
}
