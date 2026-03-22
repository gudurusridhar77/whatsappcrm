package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ChannelEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChannelEmailRepository extends JpaRepository<ChannelEmail, Long> {

    Optional<ChannelEmail> findByEmailAddress(String emailAddress);
}
