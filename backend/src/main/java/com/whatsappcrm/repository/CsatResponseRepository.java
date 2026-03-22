package com.whatsappcrm.repository;

import com.whatsappcrm.entity.CsatResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CsatResponseRepository extends JpaRepository<CsatResponse, Long> {

    Optional<CsatResponse> findBySurveyToken(String surveyToken);

    Optional<CsatResponse> findByConversationId(Long conversationId);

    void deleteByConversationId(Long conversationId);

    Page<CsatResponse> findByAccountIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(Long accountId, Pageable pageable);

    Page<CsatResponse> findByAccountIdAndAssignedAgent_IdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(
            Long accountId, Long agentId, Pageable pageable);

    @Query("SELECT AVG(c.rating) FROM CsatResponse c WHERE c.account.id = :accountId AND c.submittedAt IS NOT NULL")
    Double getAverageRating(@Param("accountId") Long accountId);

    @Query("SELECT AVG(c.rating) FROM CsatResponse c WHERE c.account.id = :accountId AND c.submittedAt IS NOT NULL AND c.submittedAt BETWEEN :start AND :end")
    Double getAverageRatingBetween(@Param("accountId") Long accountId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT AVG(c.rating) FROM CsatResponse c WHERE c.account.id = :accountId AND c.assignedAgent.id = :agentId AND c.submittedAt IS NOT NULL")
    Double getAverageRatingByAgent(@Param("accountId") Long accountId, @Param("agentId") Long agentId);

    @Query("SELECT c.rating, COUNT(c) FROM CsatResponse c WHERE c.account.id = :accountId AND c.submittedAt IS NOT NULL GROUP BY c.rating ORDER BY c.rating")
    List<Object[]> getRatingDistribution(@Param("accountId") Long accountId);

    @Query("SELECT c.rating, COUNT(c) FROM CsatResponse c WHERE c.account.id = :accountId AND c.submittedAt IS NOT NULL AND c.submittedAt BETWEEN :start AND :end GROUP BY c.rating ORDER BY c.rating")
    List<Object[]> getRatingDistributionBetween(@Param("accountId") Long accountId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    long countByAccountIdAndSubmittedAtIsNotNull(Long accountId);

    long countByAccountIdAndSurveyTokenIsNotNullAndSubmittedAtIsNull(Long accountId);
}
