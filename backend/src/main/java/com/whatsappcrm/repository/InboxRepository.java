package com.whatsappcrm.repository;

import com.whatsappcrm.entity.Inbox;
import com.whatsappcrm.enums.ChannelType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InboxRepository extends JpaRepository<Inbox, Long> {
    List<Inbox> findByAccountId(Long accountId);
    Optional<Inbox> findByIdAndAccountId(Long id, Long accountId);
    Optional<Inbox> findByToken(String token);
    List<Inbox> findByAccountIdAndChannelType(Long accountId, ChannelType channelType);

    Optional<Inbox> findByChannelTypeAndChannelId(ChannelType channelType, String channelId);
}
