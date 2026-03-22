package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ScheduledMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduledMessageRepository extends JpaRepository<ScheduledMessage, Long> {

    List<ScheduledMessage> findByAccountIdOrderByScheduledAtAsc(Long accountId);

    Optional<ScheduledMessage> findByIdAndAccountId(Long id, Long accountId);

    /**
     * Find all messages that are due to be sent (scheduled time has passed and status is PENDING).
     */
    List<ScheduledMessage> findByStatusAndScheduledAtBefore(
            ScheduledMessage.ScheduleStatus status, LocalDateTime before);

    List<ScheduledMessage> findByAccountIdAndStatusOrderByScheduledAtAsc(
            Long accountId, ScheduledMessage.ScheduleStatus status);

    long countByAccountIdAndStatus(Long accountId, ScheduledMessage.ScheduleStatus status);
}
