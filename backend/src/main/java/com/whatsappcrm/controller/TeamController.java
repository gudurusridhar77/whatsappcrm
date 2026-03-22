package com.whatsappcrm.controller;

import com.whatsappcrm.dto.CreateTeamRequest;
import com.whatsappcrm.dto.TeamResponse;
import com.whatsappcrm.dto.UpdateTeamRequest;
import com.whatsappcrm.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    public ResponseEntity<List<TeamResponse>> getTeams(@PathVariable Long accountId) {
        return ResponseEntity.ok(teamService.getTeams(accountId));
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<TeamResponse> getTeam(
            @PathVariable Long accountId,
            @PathVariable Long teamId) {
        return ResponseEntity.ok(teamService.getTeam(accountId, teamId));
    }

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(
            @PathVariable Long accountId,
            @Valid @RequestBody CreateTeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teamService.createTeam(accountId, request));
    }

    @PatchMapping("/{teamId}")
    public ResponseEntity<TeamResponse> updateTeam(
            @PathVariable Long accountId,
            @PathVariable Long teamId,
            @Valid @RequestBody UpdateTeamRequest request) {
        return ResponseEntity.ok(teamService.updateTeam(accountId, teamId, request));
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long accountId,
            @PathVariable Long teamId) {
        teamService.deleteTeam(accountId, teamId);
        return ResponseEntity.noContent().build();
    }

    // Member management
    @PostMapping("/{teamId}/members")
    public ResponseEntity<TeamResponse> addMembers(
            @PathVariable Long accountId,
            @PathVariable Long teamId,
            @RequestBody Map<String, Set<Long>> body) {
        Set<Long> userIds = body.getOrDefault("userIds", Set.of());
        return ResponseEntity.ok(teamService.addMembers(accountId, teamId, userIds));
    }

    @PutMapping("/{teamId}/members")
    public ResponseEntity<TeamResponse> setMembers(
            @PathVariable Long accountId,
            @PathVariable Long teamId,
            @RequestBody Map<String, Set<Long>> body) {
        Set<Long> userIds = body.getOrDefault("userIds", Set.of());
        return ResponseEntity.ok(teamService.setMembers(accountId, teamId, userIds));
    }

    @DeleteMapping("/{teamId}/members")
    public ResponseEntity<TeamResponse> removeMembers(
            @PathVariable Long accountId,
            @PathVariable Long teamId,
            @RequestBody Map<String, Set<Long>> body) {
        Set<Long> userIds = body.getOrDefault("userIds", Set.of());
        return ResponseEntity.ok(teamService.removeMembers(accountId, teamId, userIds));
    }
}
