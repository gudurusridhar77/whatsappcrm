package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class CreateTeamRequest {

    @NotBlank(message = "Team name is required")
    @Size(max = 100, message = "Name must be less than 100 characters")
    private String name;

    @Size(max = 255, message = "Description must be less than 255 characters")
    private String description;

    private Boolean allowAutoAssign;

    private Set<Long> memberIds;
}
