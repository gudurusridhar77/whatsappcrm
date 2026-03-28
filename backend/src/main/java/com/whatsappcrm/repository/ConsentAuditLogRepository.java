package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ConsentAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConsentAuditLogRepository extends JpaRepository<ConsentAuditLog, Long> {

    List<ConsentAuditLog> findByAccountIdAndContactIdOrderByCreatedAtDesc(Long accountId, Long contactId);

    List<ConsentAuditLog> findByAccountIdOrderByCreatedAtDesc(Long accountId);
}
