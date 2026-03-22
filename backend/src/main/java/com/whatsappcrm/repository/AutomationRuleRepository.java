package com.whatsappcrm.repository;

import com.whatsappcrm.entity.AutomationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AutomationRuleRepository extends JpaRepository<AutomationRule, Long> {

    List<AutomationRule> findByAccountIdAndActiveTrueOrderByCreatedAtAsc(Long accountId);

    List<AutomationRule> findByAccountIdAndEventNameAndActiveTrueOrderByCreatedAtAsc(Long accountId, String eventName);

    List<AutomationRule> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    Optional<AutomationRule> findByIdAndAccountId(Long id, Long accountId);
}
