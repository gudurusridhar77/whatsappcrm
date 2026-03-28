package com.whatsappcrm.repository;

import com.whatsappcrm.entity.ContactConsent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContactConsentRepository extends JpaRepository<ContactConsent, Long> {

    Optional<ContactConsent> findByAccountIdAndContactId(Long accountId, Long contactId);

    List<ContactConsent> findByAccountIdOrderByUpdatedAtDesc(Long accountId);

    List<ContactConsent> findByAccountIdAndStatusOrderByUpdatedAtDesc(
            Long accountId, ContactConsent.ConsentStatus status);

    long countByAccountIdAndStatus(Long accountId, ContactConsent.ConsentStatus status);

    @Query("SELECT cc FROM ContactConsent cc JOIN FETCH cc.contact WHERE cc.account.id = :accountId ORDER BY cc.updatedAt DESC")
    List<ContactConsent> findAllWithContactByAccountId(@Param("accountId") Long accountId);

    @Query("SELECT cc FROM ContactConsent cc JOIN FETCH cc.contact WHERE cc.account.id = :accountId AND cc.status = :status ORDER BY cc.updatedAt DESC")
    List<ContactConsent> findAllWithContactByAccountIdAndStatus(
            @Param("accountId") Long accountId, @Param("status") ContactConsent.ConsentStatus status);

    /**
     * Check if a contact is opted out. Returns true if explicitly OPT_OUT.
     * If no consent record exists, the contact is considered opted-in by default.
     */
    @Query("SELECT CASE WHEN COUNT(cc) > 0 THEN true ELSE false END FROM ContactConsent cc " +
           "WHERE cc.account.id = :accountId AND cc.contact.id = :contactId AND cc.status = 'OPT_OUT'")
    boolean isOptedOut(@Param("accountId") Long accountId, @Param("contactId") Long contactId);
}
