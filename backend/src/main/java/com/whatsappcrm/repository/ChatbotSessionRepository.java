package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ChatbotSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatbotSessionRepository extends JpaRepository<ChatbotSession, Long> {

    Optional<ChatbotSession> findByConversationIdAndStatus(Long conversationId, String status);

    Optional<ChatbotSession> findByConversationIdAndStatusIn(Long conversationId, java.util.List<String> statuses);

    void deleteByConversationId(Long conversationId);
}
