package com.whatsappcrm.controller;

import com.whatsappcrm.dto.SearchResponse;
import com.whatsappcrm.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<SearchResponse> search(
            @PathVariable Long accountId,
            @RequestParam String q) {
        if (q == null || q.trim().length() < 2) {
            return ResponseEntity.ok(SearchResponse.builder()
                    .conversations(java.util.List.of())
                    .contacts(java.util.List.of())
                    .messages(java.util.List.of())
                    .build());
        }
        return ResponseEntity.ok(searchService.search(accountId, q.trim()));
    }
}
