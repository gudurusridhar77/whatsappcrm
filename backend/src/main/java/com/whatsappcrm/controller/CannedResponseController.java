package com.whatsappcrm.controller;

import com.whatsappcrm.dto.CannedResponseDto;
import com.whatsappcrm.service.CannedResponseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/canned_responses")
@RequiredArgsConstructor
public class CannedResponseController {

    private final CannedResponseService cannedResponseService;

    @GetMapping
    public ResponseEntity<List<CannedResponseDto>> getAll(
            @PathVariable Long accountId,
            @RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(cannedResponseService.search(accountId, search));
        }
        return ResponseEntity.ok(cannedResponseService.getAll(accountId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CannedResponseDto> getById(
            @PathVariable Long accountId,
            @PathVariable Long id) {
        return ResponseEntity.ok(cannedResponseService.getById(accountId, id));
    }

    @PostMapping
    public ResponseEntity<CannedResponseDto> create(
            @PathVariable Long accountId,
            @Valid @RequestBody CannedResponseDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cannedResponseService.create(accountId, dto));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CannedResponseDto> update(
            @PathVariable Long accountId,
            @PathVariable Long id,
            @RequestBody CannedResponseDto dto) {
        return ResponseEntity.ok(cannedResponseService.update(accountId, id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long accountId,
            @PathVariable Long id) {
        cannedResponseService.delete(accountId, id);
        return ResponseEntity.noContent().build();
    }
}
