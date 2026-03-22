package com.whatsappcrm.controller;

import com.whatsappcrm.dto.NotificationResponse;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.service.NotificationService;
import com.whatsappcrm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        return ResponseEntity.ok(notificationService.getNotifications(userId, accountId, unreadOnly, PageRequest.of(page, size)));
    }

    @GetMapping("/unread_count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @PathVariable Long accountId,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        long count = notificationService.getUnreadCount(userId, accountId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long accountId,
            @PathVariable Long notificationId,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        notificationService.markAsRead(notificationId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read_all")
    public ResponseEntity<Void> markAllAsRead(
            @PathVariable Long accountId,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        notificationService.markAllAsRead(userId, accountId);
        return ResponseEntity.ok().build();
    }

    private Long getCurrentUserId(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName());
        return user.getId();
    }
}
