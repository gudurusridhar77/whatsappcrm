package com.whatsappcrm.repository;

import com.whatsappcrm.entity.Broadcast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BroadcastRepository extends JpaRepository<Broadcast, Long> {

    List<Broadcast> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    Optional<Broadcast> findByIdAndAccountId(Long id, Long accountId);

    List<Broadcast> findByStatus(Broadcast.BroadcastStatus status);
}
