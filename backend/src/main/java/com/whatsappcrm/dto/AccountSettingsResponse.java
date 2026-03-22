package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Account;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class AccountSettingsResponse {
    private Long id;
    private String name;
    private String domain;
    private String locale;
    private String timezone;
    private String businessHours;
    private Integer autoResolveHours;
    private String status;

    public static AccountSettingsResponse fromAccount(Account account) {
        return AccountSettingsResponse.builder()
                .id(account.getId())
                .name(account.getName())
                .domain(account.getDomain())
                .locale(account.getLocale())
                .timezone(account.getTimezone())
                .businessHours(account.getBusinessHours())
                .autoResolveHours(account.getAutoResolveHours())
                .status(account.getStatus().name())
                .build();
    }
}
