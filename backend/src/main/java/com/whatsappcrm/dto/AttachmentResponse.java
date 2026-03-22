package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Attachment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class AttachmentResponse {
    private Long id;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private String fileType;
    private String dataUrl;
    private String thumbUrl;
    private LocalDateTime createdAt;

    public static AttachmentResponse fromAttachment(Attachment attachment, String baseUrl) {
        return AttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .contentType(attachment.getContentType())
                .fileSize(attachment.getFileSize())
                .fileType(attachment.getFileType().name())
                .dataUrl(baseUrl + "/api/v1/attachments/" + attachment.getId() + "/download")
                .thumbUrl(attachment.getThumbPath() != null
                        ? baseUrl + "/api/v1/attachments/" + attachment.getId() + "/thumb"
                        : null)
                .createdAt(attachment.getCreatedAt())
                .build();
    }
}
