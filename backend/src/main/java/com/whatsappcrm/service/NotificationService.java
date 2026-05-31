package com.whatsappcrm.service;

import com.whatsappcrm.dto.NotificationResponse;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.Notification;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.AccountUserRepository;
import com.whatsappcrm.repository.NotificationRepository;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final AccountUserRepository accountUserRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebPushService webPushService;

    /**
     * Create and broadcast a notification to a specific user
     */
    @Transactional
    public void notifyUser(Long accountId, Long userId, String notificationType, String category,
                           String title, String message, String entityType, Long entityId,
                           Map<String, Object> metadata) {
        Account account = accountRepository.findById(accountId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);
        if (account == null || user == null) return;

        Notification notification = Notification.builder()
                .account(account)
                .user(user)
                .notificationType(notificationType)
                .category(category)
                .title(title)
                .message(message)
                .entityType(entityType)
                .entityId(entityId)
                .metadata(metadata != null ? metadata : Map.of())
                .build();

        notification = notificationRepository.save(notification);

        // Broadcast via WebSocket to the specific user
        NotificationResponse response = NotificationResponse.fromEntity(notification);
        messagingTemplate.convertAndSend(
                "/topic/users/" + userId + "/notifications", response);

        // Also send a Web Push so the user is alerted even when the app/PWA is
        // closed or backgrounded (no-op if push isn't configured/subscribed).
        try {
            webPushService.sendToUser(userId, title, message, "/conversations");
        } catch (Exception e) {
            log.warn("Web push notification failed for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Notify all agents in an account (except the one who triggered the action)
     */
    @Transactional
    public void notifyAllAgents(Long accountId, Long excludeUserId, String notificationType,
                                 String category, String title, String message,
                                 String entityType, Long entityId, Map<String, Object> metadata) {
        List<Long> agentIds = accountUserRepository.findUserIdsByAccountId(accountId);
        for (Long agentId : agentIds) {
            if (!agentId.equals(excludeUserId)) {
                notifyUser(accountId, agentId, notificationType, category, title, message,
                          entityType, entityId, metadata);
            }
        }
    }

    /**
     * Notify the assignee of a conversation
     */
    @Transactional
    public void notifyAssignee(Long accountId, Long assigneeId, Long triggeredByUserId,
                                String notificationType, String title, String message,
                                Long conversationId, Map<String, Object> metadata) {
        if (assigneeId == null || assigneeId.equals(triggeredByUserId)) return;
        notifyUser(accountId, assigneeId, notificationType, "conversation", title, message,
                  "Conversation", conversationId, metadata);
    }

    public Page<NotificationResponse> getNotifications(Long userId, Long accountId, boolean unreadOnly, Pageable pageable) {
        if (unreadOnly) {
            return notificationRepository.findByUser_IdAndAccount_IdAndReadAtIsNullOrderByCreatedAtDesc(userId, accountId, pageable)
                    .map(NotificationResponse::fromEntity);
        }
        return notificationRepository.findByUser_IdAndAccount_IdOrderByCreatedAtDesc(userId, accountId, pageable)
                .map(NotificationResponse::fromEntity);
    }

    public long getUnreadCount(Long userId, Long accountId) {
        return notificationRepository.countByUser_IdAndAccount_IdAndReadAtIsNull(userId, accountId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        int updated = notificationRepository.markAsRead(notificationId, userId, LocalDateTime.now());
        if (updated == 0) throw new ResourceNotFoundException("Notification not found");
    }

    @Transactional
    public void markAllAsRead(Long userId, Long accountId) {
        notificationRepository.markAllAsRead(userId, accountId, LocalDateTime.now());
    }
}
