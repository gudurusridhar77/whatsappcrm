package com.whatsappcrm.dto;

import com.whatsappcrm.entity.AccountUser;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class AgentResponse {
    private Long id;
    private String name;
    private String email;
    private String avatarUrl;
    private String role;
    private String availability;

    public static AgentResponse fromAccountUser(AccountUser au) {
        return AgentResponse.builder()
                .id(au.getUser().getId())
                .name(au.getUser().getName())
                .email(au.getUser().getEmail())
                .avatarUrl(au.getUser().getAvatarUrl())
                .role(au.getRole().name())
                .build();
    }
}
