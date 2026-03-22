package com.whatsappcrm.dto;

import lombok.Data;

@Data
public class UpdateAccountSettingsRequest {
    private String name;
    private String domain;
    private String locale;
    private String timezone;
    private String businessHours; // JSON string
    private Integer autoResolveHours;
}
