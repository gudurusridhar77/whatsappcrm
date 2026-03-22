package com.whatsappcrm.controller;

import com.whatsappcrm.dto.AccountSettingsResponse;
import com.whatsappcrm.dto.AccountUserResponse;
import com.whatsappcrm.dto.InviteUserRequest;
import com.whatsappcrm.dto.UpdateAccountSettingsRequest;
import com.whatsappcrm.dto.UpdateRoleRequest;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.service.AccountService;
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
@RequestMapping("/api/v1/accounts/{accountId}")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final UserService userService;

    @GetMapping("/users")
    public ResponseEntity<List<AccountUserResponse>> getAccountUsers(
            @PathVariable Long accountId,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(accountService.getAccountUsers(accountId, currentUserId));
    }

    @PostMapping("/users/invite")
    public ResponseEntity<AccountUserResponse> inviteUser(
            @PathVariable Long accountId,
            @Valid @RequestBody InviteUserRequest request,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accountService.inviteUser(accountId, currentUserId, request));
    }

    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<AccountUserResponse> updateUserRole(
            @PathVariable Long accountId,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateRoleRequest request,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(accountService.updateUserRole(accountId, userId, currentUserId, request));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Map<String, String>> removeUser(
            @PathVariable Long accountId,
            @PathVariable Long userId,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        accountService.removeUser(accountId, userId, currentUserId);
        return ResponseEntity.ok(Map.of("message", "User removed from account"));
    }

    // Account Settings
    @GetMapping("/settings")
    public ResponseEntity<AccountSettingsResponse> getSettings(
            @PathVariable Long accountId,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(accountService.getAccountSettings(accountId, currentUserId));
    }

    @PatchMapping("/settings")
    public ResponseEntity<AccountSettingsResponse> updateSettings(
            @PathVariable Long accountId,
            @RequestBody UpdateAccountSettingsRequest request,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(accountService.updateAccountSettings(accountId, currentUserId, request));
    }

    private Long getCurrentUserId(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName());
        return user.getId();
    }
}
