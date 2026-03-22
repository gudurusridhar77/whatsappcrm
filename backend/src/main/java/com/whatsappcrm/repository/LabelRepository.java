package com.whatsappcrm.repository;

import com.whatsappcrm.entity.Label;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface LabelRepository extends JpaRepository<Label, Long> {

    List<Label> findByAccountIdOrderByTitleAsc(Long accountId);

    List<Label> findByAccountIdAndShowOnSidebarTrueOrderByTitleAsc(Long accountId);

    Optional<Label> findByIdAndAccountId(Long id, Long accountId);

    Optional<Label> findByAccountIdAndTitle(Long accountId, String title);

    List<Label> findByIdInAndAccountId(Set<Long> ids, Long accountId);

    boolean existsByAccountIdAndTitle(Long accountId, String title);

    @Query("SELECT l FROM Label l JOIN l.conversations c WHERE c.id = :conversationId")
    List<Label> findByConversationId(@Param("conversationId") Long conversationId);

    @Query("SELECT COUNT(c) FROM Conversation c JOIN c.labels l WHERE l.id = :labelId AND c.account.id = :accountId")
    long countConversationsByLabelId(@Param("labelId") Long labelId, @Param("accountId") Long accountId);
}
