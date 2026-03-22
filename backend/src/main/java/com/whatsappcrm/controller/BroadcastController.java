package com.whatsappcrm.controller;

import com.whatsappcrm.dto.BroadcastRequest;
import com.whatsappcrm.dto.BroadcastResponse;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.service.BroadcastService;
import com.whatsappcrm.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/broadcasts")
@RequiredArgsConstructor
public class BroadcastController {

    private final BroadcastService broadcastService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<BroadcastResponse>> getBroadcasts(@PathVariable Long accountId) {
        return ResponseEntity.ok(broadcastService.getBroadcasts(accountId));
    }

    @GetMapping("/{broadcastId}")
    public ResponseEntity<BroadcastResponse> getBroadcast(
            @PathVariable Long accountId,
            @PathVariable Long broadcastId) {
        return ResponseEntity.ok(broadcastService.getBroadcast(accountId, broadcastId));
    }

    @PostMapping
    public ResponseEntity<BroadcastResponse> createBroadcast(
            @PathVariable Long accountId,
            @Valid @RequestBody BroadcastRequest request,
            Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(broadcastService.createBroadcast(accountId, request, user.getId()));
    }

    @PostMapping("/{broadcastId}/start")
    public ResponseEntity<BroadcastResponse> startBroadcast(
            @PathVariable Long accountId,
            @PathVariable Long broadcastId) {
        return ResponseEntity.ok(broadcastService.startBroadcast(accountId, broadcastId));
    }

    @PostMapping("/{broadcastId}/cancel")
    public ResponseEntity<Map<String, String>> cancelBroadcast(
            @PathVariable Long accountId,
            @PathVariable Long broadcastId) {
        broadcastService.cancelBroadcast(accountId, broadcastId);
        return ResponseEntity.ok(Map.of("message", "Broadcast cancelled"));
    }

    @DeleteMapping("/{broadcastId}")
    public ResponseEntity<Map<String, String>> deleteBroadcast(
            @PathVariable Long accountId,
            @PathVariable Long broadcastId) {
        broadcastService.deleteBroadcast(accountId, broadcastId);
        return ResponseEntity.ok(Map.of("message", "Broadcast deleted"));
    }
}
