package com.whatsappcrm.dto;

import lombok.Data;

@Data
public class ConsentUpdateRequest {
    private String status;  // OPT_IN or OPT_OUT
    private String notes;   // Optional reason
}
