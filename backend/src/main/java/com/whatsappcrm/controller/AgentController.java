package com.whatsappcrm.controller;

import com.whatsappcrm.dto.AgentResponse;
import com.whatsappcrm.service.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/agents")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;

    @GetMapping
    public ResponseEntity<List<AgentResponse>> getAgents(@PathVariable Long accountId) {
        return ResponseEntity.ok(agentService.getAgents(accountId));
    }
}
