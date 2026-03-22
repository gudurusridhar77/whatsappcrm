package com.whatsappcrm.repository;

import com.whatsappcrm.entity.InboxMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InboxMemberRepository extends JpaRepository<InboxMember, Long> {
    List<InboxMember> findByInboxId(Long inboxId);
    boolean existsByInboxIdAndUserId(Long inboxId, Long userId);
    void deleteByInboxIdAndUserId(Long inboxId, Long userId);
}
