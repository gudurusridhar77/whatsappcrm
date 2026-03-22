package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Contact;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class ContactResponse {
    private Long id;
    private String name;
    private String email;
    private String phoneNumber;
    private String company;
    private String description;
    private String avatarUrl;
    private Map<String, Object> customAttributes;
    private LocalDateTime lastActivityAt;
    private LocalDateTime createdAt;

    public static ContactResponse fromContact(Contact contact) {
        return ContactResponse.builder()
                .id(contact.getId())
                .name(contact.getName())
                .email(contact.getEmail())
                .phoneNumber(contact.getPhoneNumber())
                .company(contact.getCompany())
                .description(contact.getDescription())
                .avatarUrl(contact.getAvatarUrl())
                .customAttributes(contact.getCustomAttributes())
                .lastActivityAt(contact.getLastActivityAt())
                .createdAt(contact.getCreatedAt())
                .build();
    }
}
