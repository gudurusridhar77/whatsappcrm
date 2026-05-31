package com.whatsappcrm.controller;

import com.whatsappcrm.entity.User;
import com.whatsappcrm.repository.UserRepository;
import com.whatsappcrm.service.WebPushService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/push")
@RequiredArgsConstructor
public class PushController {

    private final WebPushService webPushService;
    private final UserRepository userRepository;

    /** The VAPID public key the browser needs to subscribe. */
    @GetMapping("/public-key")
    public ResponseEntity<Map<String, Object>> publicKey() {
        return ResponseEntity.ok(Map.of(
                "enabled", webPushService.isEnabled(),
                "publicKey", webPushService.getPublicKey() == null ? "" : webPushService.getPublicKey()
        ));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, String>> subscribe(@RequestBody SubscribeRequest req,
                                                         Authentication authentication) {
        if (req.getEndpoint() == null || req.getKeys() == null) {
            return ResponseEntity.badRequest().body(Map.of("status", "invalid subscription"));
        }
        User user = currentUser(authentication);
        webPushService.saveSubscription(user, req.getEndpoint(), req.getKeys().getP256dh(), req.getKeys().getAuth());
        return ResponseEntity.ok(Map.of("status", "subscribed"));
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Map<String, String>> unsubscribe(@RequestBody UnsubscribeRequest req) {
        if (req.getEndpoint() != null) {
            webPushService.removeSubscription(req.getEndpoint());
        }
        return ResponseEntity.ok(Map.of("status", "unsubscribed"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }

    @Data
    public static class SubscribeRequest {
        private String endpoint;
        private Keys keys;

        @Data
        public static class Keys {
            private String p256dh;
            private String auth;
        }
    }

    @Data
    public static class UnsubscribeRequest {
        private String endpoint;
    }
}
