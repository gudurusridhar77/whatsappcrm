package com.whatsappcrm.controller;

import com.whatsappcrm.dto.CsatReportResponse;
import com.whatsappcrm.dto.CsatSubmitRequest;
import com.whatsappcrm.dto.CsatSurveyResponse;
import com.whatsappcrm.service.CsatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class CsatController {

    private final CsatService csatService;

    // === Internal APIs (authenticated) ===

    @PostMapping("/api/v1/accounts/{accountId}/conversations/{conversationId}/csat")
    public ResponseEntity<Map<String, String>> createSurvey(
            @PathVariable Long accountId,
            @PathVariable Long conversationId) {
        String token = csatService.createSurvey(accountId, conversationId);
        String surveyUrl = "/survey/" + token;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("token", token, "surveyUrl", surveyUrl));
    }

    @GetMapping("/api/v1/accounts/{accountId}/csat/responses")
    public ResponseEntity<Page<CsatSurveyResponse>> getResponses(
            @PathVariable Long accountId,
            @RequestParam(required = false) Long agentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(csatService.getResponses(accountId, agentId, PageRequest.of(page, size)));
    }

    @GetMapping("/api/v1/accounts/{accountId}/csat/report")
    public ResponseEntity<CsatReportResponse> getReport(
            @PathVariable Long accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(csatService.getReport(accountId, startDate, endDate));
    }

    // === Public APIs (no auth, token-based) ===

    @GetMapping("/public/csat/{token}")
    public ResponseEntity<CsatSurveyResponse> getSurvey(@PathVariable String token) {
        return ResponseEntity.ok(csatService.getSurveyByToken(token));
    }

    @PostMapping("/public/csat/{token}")
    public ResponseEntity<CsatSurveyResponse> submitSurvey(
            @PathVariable String token,
            @Valid @RequestBody CsatSubmitRequest request) {
        return ResponseEntity.ok(csatService.submitSurvey(token, request));
    }
}
