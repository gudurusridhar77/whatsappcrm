package com.whatsappcrm.repository;

import com.whatsappcrm.entity.WhatsAppTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WhatsAppTemplateRepository extends JpaRepository<WhatsAppTemplate, Long> {

    List<WhatsAppTemplate> findByAccountIdAndInboxId(Long accountId, Long inboxId);

    List<WhatsAppTemplate> findByAccountId(Long accountId);

    List<WhatsAppTemplate> findByAccountIdAndStatus(Long accountId, WhatsAppTemplate.TemplateStatus status);

    Optional<WhatsAppTemplate> findByIdAndAccountId(Long id, Long accountId);

    Optional<WhatsAppTemplate> findByAccountIdAndNameAndLanguage(Long accountId, String name, String language);

    Optional<WhatsAppTemplate> findByAccountIdAndInboxIdAndNameAndLanguage(
            Long accountId, Long inboxId, String name, String language);

    void deleteByIdAndAccountId(Long id, Long accountId);
}
