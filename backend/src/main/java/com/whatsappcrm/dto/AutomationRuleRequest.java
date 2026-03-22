package com.whatsappcrm.dto;

import com.whatsappcrm.entity.AutomationRule.RuleAction;
import com.whatsappcrm.entity.AutomationRule.RuleCondition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class AutomationRuleRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotBlank(message = "Event name is required")
    private String eventName;

    private Boolean active;

    @NotEmpty(message = "At least one condition is required")
    private List<RuleCondition> conditions;

    @NotEmpty(message = "At least one action is required")
    private List<RuleAction> actions;
}
