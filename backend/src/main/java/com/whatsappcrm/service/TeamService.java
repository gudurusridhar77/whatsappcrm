package com.whatsappcrm.service;

import com.whatsappcrm.dto.CreateTeamRequest;
import com.whatsappcrm.dto.TeamResponse;
import com.whatsappcrm.dto.UpdateTeamRequest;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.Team;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.TeamRepository;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public List<TeamResponse> getTeams(Long accountId) {
        return teamRepository.findByAccountIdOrderByNameAsc(accountId).stream()
                .map(TeamResponse::fromTeam)
                .collect(Collectors.toList());
    }

    public TeamResponse getTeam(Long accountId, Long teamId) {
        Team team = teamRepository.findByIdAndAccountId(teamId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
        return TeamResponse.fromTeam(team);
    }

    @Transactional
    public TeamResponse createTeam(Long accountId, CreateTeamRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (teamRepository.existsByAccountIdAndName(accountId, request.getName())) {
            throw new BadRequestException("A team with this name already exists");
        }

        Team team = Team.builder()
                .account(account)
                .name(request.getName())
                .description(request.getDescription())
                .allowAutoAssign(request.getAllowAutoAssign() != null ? request.getAllowAutoAssign() : true)
                .build();

        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            Set<User> members = new HashSet<>(userRepository.findAllById(request.getMemberIds()));
            team.setMembers(members);
        }

        team = teamRepository.save(team);
        return TeamResponse.fromTeam(team);
    }

    @Transactional
    public TeamResponse updateTeam(Long accountId, Long teamId, UpdateTeamRequest request) {
        Team team = teamRepository.findByIdAndAccountId(teamId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));

        if (StringUtils.hasText(request.getName()) && !request.getName().equals(team.getName())) {
            if (teamRepository.existsByAccountIdAndName(accountId, request.getName())) {
                throw new BadRequestException("A team with this name already exists");
            }
            team.setName(request.getName());
        }

        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }
        if (request.getAllowAutoAssign() != null) {
            team.setAllowAutoAssign(request.getAllowAutoAssign());
        }

        team = teamRepository.save(team);
        return TeamResponse.fromTeam(team);
    }

    @Transactional
    public void deleteTeam(Long accountId, Long teamId) {
        Team team = teamRepository.findByIdAndAccountId(teamId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
        teamRepository.delete(team);
    }

    // Team member management
    @Transactional
    public TeamResponse addMembers(Long accountId, Long teamId, Set<Long> userIds) {
        Team team = teamRepository.findByIdAndAccountId(teamId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));

        Set<User> newMembers = new HashSet<>(userRepository.findAllById(userIds));
        team.getMembers().addAll(newMembers);
        team = teamRepository.save(team);
        return TeamResponse.fromTeam(team);
    }

    @Transactional
    public TeamResponse removeMembers(Long accountId, Long teamId, Set<Long> userIds) {
        Team team = teamRepository.findByIdAndAccountId(teamId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));

        team.getMembers().removeIf(m -> userIds.contains(m.getId()));
        team = teamRepository.save(team);
        return TeamResponse.fromTeam(team);
    }

    @Transactional
    public TeamResponse setMembers(Long accountId, Long teamId, Set<Long> userIds) {
        Team team = teamRepository.findByIdAndAccountId(teamId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));

        Set<User> members = new HashSet<>(userRepository.findAllById(userIds));
        team.setMembers(members);
        team = teamRepository.save(team);
        return TeamResponse.fromTeam(team);
    }
}
