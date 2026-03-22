package com.whatsappcrm.controller;

import com.whatsappcrm.dto.ContactImportResult;
import com.whatsappcrm.dto.ContactRequest;
import com.whatsappcrm.dto.ContactResponse;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.service.ContactService;
import com.whatsappcrm.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<ContactResponse>> getContacts(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        PageRequest pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(contactService.getContacts(accountId, search, pageable));
    }

    @GetMapping("/{contactId}")
    public ResponseEntity<ContactResponse> getContact(
            @PathVariable Long accountId,
            @PathVariable Long contactId) {
        return ResponseEntity.ok(contactService.getContact(accountId, contactId));
    }

    @PostMapping
    public ResponseEntity<ContactResponse> createContact(
            @PathVariable Long accountId,
            @Valid @RequestBody ContactRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contactService.createContact(accountId, request));
    }

    @PutMapping("/{contactId}")
    public ResponseEntity<ContactResponse> updateContact(
            @PathVariable Long accountId,
            @PathVariable Long contactId,
            @Valid @RequestBody ContactRequest request) {
        return ResponseEntity.ok(contactService.updateContact(accountId, contactId, request));
    }

    @DeleteMapping("/{contactId}")
    public ResponseEntity<Map<String, String>> deleteContact(
            @PathVariable Long accountId,
            @PathVariable Long contactId) {
        contactService.deleteContact(accountId, contactId);
        return ResponseEntity.ok(Map.of("message", "Contact deleted"));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ContactImportResult> importContacts(
            @PathVariable Long accountId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(contactService.importContacts(accountId, file));
    }
}
