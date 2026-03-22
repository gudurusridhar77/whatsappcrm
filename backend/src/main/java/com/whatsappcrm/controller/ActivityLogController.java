package com.whatsappcrm.controller;

import com.whatsappcrm.dto.ActivityLogResponse;
import com.whatsappcrm.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}")
@RequiredArgsConstructor
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping("/activity_logs")
    public ResponseEntity<Page<ActivityLogResponse>> getAllActivityLogs(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(activityLogService.getAllActivityLogs(accountId, PageRequest.of(page, size)));
    }

    @GetMapping("/contacts/{contactId}/activity_logs")
    public ResponseEntity<Page<ActivityLogResponse>> getContactActivityLogs(
            @PathVariable Long accountId,
            @PathVariable Long contactId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(activityLogService.getActivityLogs(accountId, "Contact", contactId, PageRequest.of(page, size)));
    }

    @GetMapping("/conversations/{conversationId}/activity_logs")
    public ResponseEntity<Page<ActivityLogResponse>> getConversationActivityLogs(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(activityLogService.getActivityLogs(accountId, "Conversation", conversationId, PageRequest.of(page, size)));
    }
}
