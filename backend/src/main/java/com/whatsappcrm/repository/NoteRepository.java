package com.whatsappcrm.repository;

import com.whatsappcrm.entity.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    Page<Note> findByContactIdAndAccountIdOrderByCreatedAtDesc(Long contactId, Long accountId, Pageable pageable);

    Optional<Note> findByIdAndAccountId(Long id, Long accountId);

    long countByContactIdAndAccountId(Long contactId, Long accountId);
}
