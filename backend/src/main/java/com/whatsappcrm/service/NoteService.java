package com.whatsappcrm.service;

import com.whatsappcrm.dto.CreateNoteRequest;
import com.whatsappcrm.dto.NoteResponse;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.Contact;
import com.whatsappcrm.entity.Note;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.ContactRepository;
import com.whatsappcrm.repository.NoteRepository;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository noteRepository;
    private final AccountRepository accountRepository;
    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;

    public Page<NoteResponse> getNotes(Long accountId, Long contactId, Pageable pageable) {
        contactRepository.findByIdAndAccountId(contactId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
        return noteRepository.findByContactIdAndAccountIdOrderByCreatedAtDesc(contactId, accountId, pageable)
                .map(NoteResponse::fromNote);
    }

    @Transactional
    public NoteResponse createNote(Long accountId, Long contactId, Long userId, CreateNoteRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        Contact contact = contactRepository.findByIdAndAccountId(contactId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Note note = Note.builder()
                .account(account)
                .contact(contact)
                .user(user)
                .content(request.getContent())
                .build();

        note = noteRepository.save(note);

        // Log activity
        activityLogService.log(accountId, "Contact", contactId, "note_added", userId,
                Map.of("noteId", note.getId(), "preview",
                        request.getContent().length() > 100
                                ? request.getContent().substring(0, 100) + "..."
                                : request.getContent()));

        return NoteResponse.fromNote(note);
    }

    @Transactional
    public NoteResponse updateNote(Long accountId, Long noteId, String content) {
        Note note = noteRepository.findByIdAndAccountId(noteId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        note.setContent(content);
        note = noteRepository.save(note);
        return NoteResponse.fromNote(note);
    }

    @Transactional
    public void deleteNote(Long accountId, Long contactId, Long noteId, Long userId) {
        Note note = noteRepository.findByIdAndAccountId(noteId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        noteRepository.delete(note);

        activityLogService.log(accountId, "Contact", contactId, "note_deleted", userId,
                Map.of("noteId", noteId));
    }
}
