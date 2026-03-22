package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ChannelWhatsapp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChannelWhatsappRepository extends JpaRepository<ChannelWhatsapp, Long> {

    Optional<ChannelWhatsapp> findByPhoneNumberId(String phoneNumberId);

    Optional<ChannelWhatsapp> findByPhoneNumber(String phoneNumber);
}
