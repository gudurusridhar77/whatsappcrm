package com.whatsappcrm.repository;

import com.whatsappcrm.entity.Conversation;
import com.whatsappcrm.enums.ConversationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Page<Conversation> findByAccountId(Long accountId, Pageable pageable);

    Page<Conversation> findByAccountIdAndStatus(Long accountId, ConversationStatus status, Pageable pageable);

    Page<Conversation> findByAccountIdAndAssigneeId(Long accountId, Long assigneeId, Pageable pageable);

    Page<Conversation> findByAccountIdAndInboxId(Long accountId, Long inboxId, Pageable pageable);

    List<Conversation> findByInboxId(Long inboxId);

    Optional<Conversation> findByIdAndAccountId(Long id, Long accountId);

    @Query("SELECT COALESCE(MAX(c.displayId), 0) FROM Conversation c WHERE c.account.id = :accountId")
    Long findMaxDisplayIdByAccountId(@Param("accountId") Long accountId);

    long countByAccountIdAndStatus(Long accountId, ConversationStatus status);

    long countByInboxId(Long inboxId);

    @Query("SELECT c FROM Conversation c JOIN c.labels l WHERE c.account.id = :accountId AND l.id = :labelId")
    Page<Conversation> findByAccountIdAndLabelId(@Param("accountId") Long accountId,
                                                  @Param("labelId") Long labelId, Pageable pageable);

    @Query("SELECT c FROM Conversation c WHERE c.account.id = :accountId AND " +
           "(CAST(c.displayId AS string) LIKE %:query% OR " +
           "LOWER(c.subject) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.contact.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.contact.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Conversation> searchConversations(@Param("accountId") Long accountId, @Param("query") String query, Pageable pageable);

    Page<Conversation> findByAccountIdAndTeamId(Long accountId, Long teamId, Pageable pageable);

    @Query("SELECT c FROM Conversation c WHERE c.account.id = :accountId AND c.contact.id = :contactId AND c.inbox.id = :inboxId AND c.status != 'RESOLVED' ORDER BY c.createdAt DESC")
    Optional<Conversation> findByAccountIdAndContactIdAndInboxIdAndStatus(@Param("accountId") Long accountId, @Param("contactId") Long contactId, @Param("inboxId") Long inboxId);

    @Query(value = "SELECT * FROM conversations WHERE additional_attributes->>'widget_token' = :token LIMIT 1", nativeQuery = true)
    Optional<Conversation> findByWidgetToken(@Param("token") String token);
}
