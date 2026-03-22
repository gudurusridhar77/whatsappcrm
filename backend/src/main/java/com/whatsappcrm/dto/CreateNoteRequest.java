package com.whatsappcrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateNoteRequest {

    @NotBlank(message = "Note content is required")
    private String content;
}
