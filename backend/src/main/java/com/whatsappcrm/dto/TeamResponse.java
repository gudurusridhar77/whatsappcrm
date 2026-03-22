package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Team;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@AllArgsConstructor
public class TeamResponse {
    private Long id;
    private String name;
    private String description;
    private Boolean allowAutoAssign;
    private List<AgentSummary> members;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @AllArgsConstructor
    public static class AgentSummary {
        private Long id;
        private String name;
        private String email;
        private String avatarUrl;
    }

    public static TeamResponse fromTeam(Team team) {
        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .allowAutoAssign(team.getAllowAutoAssign())
                .members(team.getMembers().stream()
                        .map(u -> AgentSummary.builder()
                                .id(u.getId())
                                .name(u.getName())
                                .email(u.getEmail())
                                .avatarUrl(u.getAvatarUrl())
                                .build())
                        .collect(Collectors.toList()))
                .createdAt(team.getCreatedAt())
                .build();
    }
}
