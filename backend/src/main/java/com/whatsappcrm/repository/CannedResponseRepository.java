package com.whatsappcrm.repository;

import com.whatsappcrm.entity.CannedResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CannedResponseRepository extends JpaRepository<CannedResponse, Long> {

    List<CannedResponse> findByAccountIdOrderByShortCodeAsc(Long accountId);

    Optional<CannedResponse> findByIdAndAccountId(Long id, Long accountId);

    List<CannedResponse> findByAccountIdAndShortCodeContainingIgnoreCaseOrderByShortCodeAsc(
            Long accountId, String shortCode);

    boolean existsByAccountIdAndShortCode(Long accountId, String shortCode);
}
