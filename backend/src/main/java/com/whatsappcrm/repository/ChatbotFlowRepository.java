package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ChatbotFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatbotFlowRepository extends JpaRepository<ChatbotFlow, Long> {

    List<ChatbotFlow> findByAccountIdOrderByPriorityAscCreatedAtDesc(Long accountId);

    Optional<ChatbotFlow> findByIdAndAccountId(Long id, Long accountId);

    List<ChatbotFlow> findByAccountIdAndActiveTrueOrderByPriorityAsc(Long accountId);

    List<ChatbotFlow> findByAccountIdAndActiveTrueAndInboxIdOrderByPriorityAsc(Long accountId, Long inboxId);

    List<ChatbotFlow> findByAccountIdAndActiveTrueAndInboxIsNullOrderByPriorityAsc(Long accountId);
}
