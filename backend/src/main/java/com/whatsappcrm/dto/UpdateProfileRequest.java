package com.whatsappcrm.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String displayName;
    private String avatarUrl;
}
