package com.whatsappcrm.dto;

import com.whatsappcrm.entity.AutomationRule;
import com.whatsappcrm.entity.AutomationRule.RuleAction;
import com.whatsappcrm.entity.AutomationRule.RuleCondition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class AutomationRuleResponse {
    private Long id;
    private String name;
    private String description;
    private String eventName;
    private Boolean active;
    private List<RuleCondition> conditions;
    private List<RuleAction> actions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AutomationRuleResponse fromEntity(AutomationRule rule) {
        return AutomationRuleResponse.builder()
                .id(rule.getId())
                .name(rule.getName())
                .description(rule.getDescription())
                .eventName(rule.getEventName())
                .active(rule.getActive())
                .conditions(rule.getConditions())
                .actions(rule.getActions())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }
}
