package com.whatsappcrm.dto;

import com.whatsappcrm.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String displayName;
    private String avatarUrl;
    private String availability;
    private List<AccountInfo> accounts;

    @Data
    @Builder
    @AllArgsConstructor
    public static class AccountInfo {
        private Long accountId;
        private String accountName;
        private String role;
    }

    public static UserResponse fromUser(User user) {
        List<AccountInfo> accounts = user.getAccountUsers().stream()
                .map(au -> AccountInfo.builder()
                        .accountId(au.getAccount().getId())
                        .accountName(au.getAccount().getName())
                        .role(au.getRole().name())
                        .build())
                .toList();

        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .availability(user.getAvailability().name())
                .accounts(accounts)
                .build();
    }
}
