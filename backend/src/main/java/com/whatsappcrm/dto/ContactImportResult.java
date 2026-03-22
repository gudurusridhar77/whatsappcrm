package com.whatsappcrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class ContactImportResult {
    private int totalRows;
    private int imported;
    private int skipped;
    private int failed;
    private List<ImportError> errors;

    @Data
    @AllArgsConstructor
    public static class ImportError {
        private int row;
        private String name;
        private String reason;
    }

    public static ContactImportResult empty() {
        return ContactImportResult.builder()
                .totalRows(0).imported(0).skipped(0).failed(0)
                .errors(new ArrayList<>())
                .build();
    }
}
