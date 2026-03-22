package com.whatsappcrm.repository;

import com.whatsappcrm.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    List<Team> findByAccountIdOrderByNameAsc(Long accountId);

    Optional<Team> findByIdAndAccountId(Long id, Long accountId);

    boolean existsByAccountIdAndName(Long accountId, String name);

    @Query("SELECT t FROM Team t JOIN t.members m WHERE t.account.id = :accountId AND m.id = :userId")
    List<Team> findByAccountIdAndMemberId(@Param("accountId") Long accountId, @Param("userId") Long userId);
}
