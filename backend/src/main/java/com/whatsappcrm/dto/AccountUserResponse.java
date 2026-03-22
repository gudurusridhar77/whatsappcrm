package com.whatsappcrm.dto;

import com.whatsappcrm.entity.AccountUser;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class AccountUserResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String email;
    private String role;
    private String invitationStatus;
    private String availability;
    private String displayName;

    public static AccountUserResponse fromAccountUser(AccountUser au) {
        return AccountUserResponse.builder()
                .id(au.getId())
                .userId(au.getUser().getId())
                .userName(au.getUser().getName())
                .email(au.getUser().getEmail())
                .role(au.getRole().name())
                .invitationStatus(au.getInvitationStatus().name())
                .availability(au.getUser().getAvailability().name())
                .displayName(au.getUser().getDisplayName())
                .build();
    }
}
