package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    Page<ActivityLog> findByAccountIdAndAuditableTypeAndAuditableIdOrderByCreatedAtDesc(
            Long accountId, String auditableType, Long auditableId, Pageable pageable);

    Page<ActivityLog> findByAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);
}
