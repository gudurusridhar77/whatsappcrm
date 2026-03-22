package com.whatsappcrm.service;

import com.whatsappcrm.dto.ActivityLogResponse;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.ActivityLog;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.ActivityLogRepository;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public void log(Long accountId, String auditableType, Long auditableId,
                    String activityType, Long userId, Map<String, Object> metadata) {
        Account account = accountRepository.findById(accountId).orElse(null);
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        if (account == null) return;

        ActivityLog log = ActivityLog.builder()
                .account(account)
                .auditableType(auditableType)
                .auditableId(auditableId)
                .activityType(activityType)
                .user(user)
                .metadata(metadata != null ? metadata : Map.of())
                .build();

        activityLogRepository.save(log);
    }

    public Page<ActivityLogResponse> getActivityLogs(Long accountId, String auditableType,
                                                      Long auditableId, Pageable pageable) {
        return activityLogRepository
                .findByAccountIdAndAuditableTypeAndAuditableIdOrderByCreatedAtDesc(
                        accountId, auditableType, auditableId, pageable)
                .map(ActivityLogResponse::fromEntity);
    }

    public Page<ActivityLogResponse> getAllActivityLogs(Long accountId, Pageable pageable) {
        return activityLogRepository
                .findByAccountIdOrderByCreatedAtDesc(accountId, pageable)
                .map(ActivityLogResponse::fromEntity);
    }
}
