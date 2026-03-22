package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateAvailabilityRequest {

    @NotBlank(message = "Availability status is required")
    private String availability; // ONLINE, OFFLINE, BUSY
}
