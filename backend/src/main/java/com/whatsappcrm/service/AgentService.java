package com.whatsappcrm.service;

import com.whatsappcrm.dto.AgentResponse;
import com.whatsappcrm.repository.AccountUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgentService {

    private final AccountUserRepository accountUserRepository;

    public List<AgentResponse> getAgents(Long accountId) {
        return accountUserRepository.findByAccountId(accountId).stream()
                .map(AgentResponse::fromAccountUser)
                .collect(Collectors.toList());
    }
}
