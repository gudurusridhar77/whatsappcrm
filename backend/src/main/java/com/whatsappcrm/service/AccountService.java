package com.whatsappcrm.service;

import com.whatsappcrm.dto.AccountSettingsResponse;
import com.whatsappcrm.dto.AccountUserResponse;
import com.whatsappcrm.dto.InviteUserRequest;
import com.whatsappcrm.dto.UpdateAccountSettingsRequest;
import com.whatsappcrm.dto.UpdateRoleRequest;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.AccountUser;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.enums.InvitationStatus;
import com.whatsappcrm.enums.UserRole;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ForbiddenException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.AccountUserRepository;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final AccountUserRepository accountUserRepository;
    private final PasswordEncoder passwordEncoder;

    public List<AccountUserResponse> getAccountUsers(Long accountId, Long currentUserId) {
        ensureUserInAccount(accountId, currentUserId);

        return accountUserRepository.findByAccountId(accountId).stream()
                .map(AccountUserResponse::fromAccountUser)
                .toList();
    }

    @Transactional
    public AccountUserResponse inviteUser(Long accountId, Long currentUserId, InviteUserRequest request) {
        ensureUserIsAdmin(accountId, currentUserId);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        UserRole role;
        try {
            role = UserRole.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role. Must be ADMIN or AGENT");
        }

        // Check if user already exists
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user != null) {
            // Check if already in account
            if (accountUserRepository.existsByAccountIdAndUserId(accountId, user.getId())) {
                throw new BadRequestException("User is already a member of this account");
            }
        } else {
            // Create user with temporary password
            user = User.builder()
                    .name(request.getName())
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .confirmed(false)
                    .build();
            user = userRepository.save(user);
        }

        AccountUser accountUser = AccountUser.builder()
                .account(account)
                .user(user)
                .role(role)
                .invitationStatus(InvitationStatus.PENDING)
                .build();
        accountUser = accountUserRepository.save(accountUser);

        return AccountUserResponse.fromAccountUser(accountUser);
    }

    @Transactional
    public AccountUserResponse updateUserRole(Long accountId, Long targetUserId, Long currentUserId,
                                               UpdateRoleRequest request) {
        ensureUserIsAdmin(accountId, currentUserId);

        AccountUser accountUser = accountUserRepository.findByAccountIdAndUserId(accountId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found in this account"));

        // Prevent removing the last admin
        if (accountUser.getRole() == UserRole.ADMIN) {
            List<AccountUser> admins = accountUserRepository.findByAccountIdAndRole(accountId, UserRole.ADMIN);
            if (admins.size() <= 1 && !"ADMIN".equalsIgnoreCase(request.getRole())) {
                throw new BadRequestException("Cannot remove the last admin from the account");
            }
        }

        UserRole role;
        try {
            role = UserRole.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role. Must be ADMIN or AGENT");
        }

        accountUser.setRole(role);
        accountUser = accountUserRepository.save(accountUser);

        return AccountUserResponse.fromAccountUser(accountUser);
    }

    @Transactional
    public void removeUser(Long accountId, Long targetUserId, Long currentUserId) {
        ensureUserIsAdmin(accountId, currentUserId);

        if (currentUserId.equals(targetUserId)) {
            throw new BadRequestException("Cannot remove yourself from the account");
        }

        AccountUser accountUser = accountUserRepository.findByAccountIdAndUserId(accountId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found in this account"));

        accountUserRepository.delete(accountUser);
    }

    public AccountSettingsResponse getAccountSettings(Long accountId, Long currentUserId) {
        ensureUserInAccount(accountId, currentUserId);
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        return AccountSettingsResponse.fromAccount(account);
    }

    @Transactional
    public AccountSettingsResponse updateAccountSettings(Long accountId, Long currentUserId,
                                                          UpdateAccountSettingsRequest request) {
        ensureUserIsAdmin(accountId, currentUserId);
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (StringUtils.hasText(request.getName())) {
            account.setName(request.getName());
        }
        if (request.getDomain() != null) {
            account.setDomain(request.getDomain());
        }
        if (request.getLocale() != null) {
            account.setLocale(request.getLocale());
        }
        if (StringUtils.hasText(request.getTimezone())) {
            account.setTimezone(request.getTimezone());
        }
        if (request.getBusinessHours() != null) {
            account.setBusinessHours(request.getBusinessHours());
        }
        if (request.getAutoResolveHours() != null) {
            account.setAutoResolveHours(request.getAutoResolveHours());
        }

        account = accountRepository.save(account);
        return AccountSettingsResponse.fromAccount(account);
    }

    private void ensureUserInAccount(Long accountId, Long userId) {
        if (!accountUserRepository.existsByAccountIdAndUserId(accountId, userId)) {
            throw new ForbiddenException("You do not have access to this account");
        }
    }

    private void ensureUserIsAdmin(Long accountId, Long userId) {
        AccountUser accountUser = accountUserRepository.findByAccountIdAndUserId(accountId, userId)
                .orElseThrow(() -> new ForbiddenException("You do not have access to this account"));

        if (accountUser.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("Only admins can perform this action");
        }
    }
}
