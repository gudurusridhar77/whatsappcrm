package com.whatsappcrm.controller;

import com.whatsappcrm.dto.CreateNoteRequest;
import com.whatsappcrm.dto.NoteResponse;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.service.NoteService;
import com.whatsappcrm.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/contacts/{contactId}/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<NoteResponse>> getNotes(
            @PathVariable Long accountId,
            @PathVariable Long contactId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(noteService.getNotes(accountId, contactId, PageRequest.of(page, size)));
    }

    @PostMapping
    public ResponseEntity<NoteResponse> createNote(
            @PathVariable Long accountId,
            @PathVariable Long contactId,
            @Valid @RequestBody CreateNoteRequest request,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(noteService.createNote(accountId, contactId, userId, request));
    }

    @PatchMapping("/{noteId}")
    public ResponseEntity<NoteResponse> updateNote(
            @PathVariable Long accountId,
            @PathVariable Long contactId,
            @PathVariable Long noteId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        return ResponseEntity.ok(noteService.updateNote(accountId, noteId, content));
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> deleteNote(
            @PathVariable Long accountId,
            @PathVariable Long contactId,
            @PathVariable Long noteId,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        noteService.deleteNote(accountId, contactId, noteId, userId);
        return ResponseEntity.noContent().build();
    }

    private Long getCurrentUserId(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName());
        return user.getId();
    }
}
