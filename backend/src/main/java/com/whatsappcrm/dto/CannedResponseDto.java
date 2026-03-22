package com.whatsappcrm.dto;

import com.whatsappcrm.entity.CannedResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CannedResponseDto {
    private Long id;

    @NotBlank(message = "Short code is required")
    @Size(max = 50, message = "Short code must be less than 50 characters")
    @Pattern(regexp = "^[a-z0-9_-]+$", message = "Short code can only contain lowercase letters, numbers, hyphens, and underscores")
    private String shortCode;

    @NotBlank(message = "Content is required")
    private String content;

    private LocalDateTime createdAt;

    public static CannedResponseDto fromEntity(CannedResponse entity) {
        return CannedResponseDto.builder()
                .id(entity.getId())
                .shortCode(entity.getShortCode())
                .content(entity.getContent())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
