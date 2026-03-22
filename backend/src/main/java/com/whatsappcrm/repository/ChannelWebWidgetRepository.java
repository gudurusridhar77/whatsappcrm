package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ChannelWebWidget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChannelWebWidgetRepository extends JpaRepository<ChannelWebWidget, Long> {
}
