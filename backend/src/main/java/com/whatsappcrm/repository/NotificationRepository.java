package com.whatsappcrm.repository;

import com.whatsappcrm.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUser_IdAndAccount_IdOrderByCreatedAtDesc(Long userId, Long accountId, Pageable pageable);

    Page<Notification> findByUser_IdAndAccount_IdAndReadAtIsNullOrderByCreatedAtDesc(Long userId, Long accountId, Pageable pageable);

    long countByUser_IdAndAccount_IdAndReadAtIsNull(Long userId, Long accountId);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.id = :id AND n.user.id = :userId")
    int markAsRead(@Param("id") Long id, @Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.user.id = :userId AND n.account.id = :accountId AND n.readAt IS NULL")
    int markAllAsRead(@Param("userId") Long userId, @Param("accountId") Long accountId, @Param("now") LocalDateTime now);

    List<Notification> findByUser_IdAndAccount_IdAndReadAtIsNull(Long userId, Long accountId);
}
