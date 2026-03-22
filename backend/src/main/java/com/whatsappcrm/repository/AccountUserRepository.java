package com.whatsappcrm.repository;

import com.whatsappcrm.entity.AccountUser;
import com.whatsappcrm.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountUserRepository extends JpaRepository<AccountUser, Long> {
    List<AccountUser> findByAccountId(Long accountId);
    List<AccountUser> findByUserId(Long userId);
    Optional<AccountUser> findByAccountIdAndUserId(Long accountId, Long userId);
    boolean existsByAccountIdAndUserId(Long accountId, Long userId);
    List<AccountUser> findByAccountIdAndRole(Long accountId, UserRole role);

    @Query("SELECT au.user.id FROM AccountUser au WHERE au.account.id = :accountId")
    List<Long> findUserIdsByAccountId(@Param("accountId") Long accountId);
}
