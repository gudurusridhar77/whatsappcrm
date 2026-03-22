package com.whatsappcrm.dto;

import com.whatsappcrm.entity.ChatbotFlow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class ChatbotFlowResponse {

    private Long id;
    private String name;
    private String description;
    private Long inboxId;
    private String inboxName;
    private String triggerType;
    private String triggerKeywords;
    private Map<String, Object> flowData;
    private Boolean active;
    private Integer priority;
    private int nodeCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @SuppressWarnings("unchecked")
    public static ChatbotFlowResponse fromEntity(ChatbotFlow flow) {
        int nodes = 0;
        if (flow.getFlowData() != null && flow.getFlowData().containsKey("nodes")) {
            Object nodesObj = flow.getFlowData().get("nodes");
            if (nodesObj instanceof java.util.List) {
                nodes = ((java.util.List<?>) nodesObj).size();
            }
        }

        return ChatbotFlowResponse.builder()
                .id(flow.getId())
                .name(flow.getName())
                .description(flow.getDescription())
                .inboxId(flow.getInbox() != null ? flow.getInbox().getId() : null)
                .inboxName(flow.getInbox() != null ? flow.getInbox().getName() : null)
                .triggerType(flow.getTriggerType())
                .triggerKeywords(flow.getTriggerKeywords())
                .flowData(flow.getFlowData())
                .active(flow.getActive())
                .priority(flow.getPriority())
                .nodeCount(nodes)
                .createdAt(flow.getCreatedAt())
                .updatedAt(flow.getUpdatedAt())
                .build();
    }
}
