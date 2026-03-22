package com.whatsappcrm.controller;

import com.whatsappcrm.dto.CampaignAnalyticsResponse;
import com.whatsappcrm.service.CampaignAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/campaign-analytics")
@RequiredArgsConstructor
public class CampaignAnalyticsController {

    private final CampaignAnalyticsService campaignAnalyticsService;

    @GetMapping
    public ResponseEntity<CampaignAnalyticsResponse> getAnalytics(
            @PathVariable Long accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        return ResponseEntity.ok(campaignAnalyticsService.getAnalytics(accountId, startDate, endDate));
    }
}
