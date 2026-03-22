package com.whatsappcrm.repository;

import com.whatsappcrm.entity.Contact;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContactRepository extends JpaRepository<Contact, Long> {

    Page<Contact> findByAccountId(Long accountId, Pageable pageable);

    Optional<Contact> findByIdAndAccountId(Long id, Long accountId);

    @Query("SELECT c FROM Contact c WHERE c.account.id = :accountId AND " +
            "(LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(c.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "c.phoneNumber LIKE CONCAT('%', :query, '%'))")
    Page<Contact> search(@Param("accountId") Long accountId, @Param("query") String query, Pageable pageable);

    Optional<Contact> findByEmailAndAccountId(String email, Long accountId);

    Optional<Contact> findByPhoneNumberAndAccountId(String phoneNumber, Long accountId);

    boolean existsByAccountIdAndEmail(Long accountId, String email);

    boolean existsByAccountIdAndPhoneNumber(Long accountId, String phoneNumber);
}
