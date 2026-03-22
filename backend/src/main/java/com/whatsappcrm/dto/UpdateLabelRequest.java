package com.whatsappcrm.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateLabelRequest {

    @Size(max = 100, message = "Title must be less than 100 characters")
    private String title;

    @Size(max = 255, message = "Description must be less than 255 characters")
    private String description;

    @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Color must be a valid hex color (e.g. #1b72e8)")
    private String color;

    private Boolean showOnSidebar;
}
