package com.whatsappcrm.repository;

import com.whatsappcrm.entity.BroadcastContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BroadcastContactRepository extends JpaRepository<BroadcastContact, Long> {

    List<BroadcastContact> findByBroadcastId(Long broadcastId);

    List<BroadcastContact> findByBroadcastIdAndStatus(Long broadcastId, BroadcastContact.MessageDeliveryStatus status);

    Optional<BroadcastContact> findByExternalMessageId(String externalMessageId);

    long countByBroadcastIdAndStatus(Long broadcastId, BroadcastContact.MessageDeliveryStatus status);

    @Modifying
    @Query("DELETE FROM BroadcastContact bc WHERE bc.broadcast.id = :broadcastId")
    void deleteByBroadcastId(@Param("broadcastId") Long broadcastId);
}
