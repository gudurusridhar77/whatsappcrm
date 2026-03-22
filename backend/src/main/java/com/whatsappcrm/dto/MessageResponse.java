package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Message;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class MessageResponse {
    private Long id;
    private String content;
    private String messageType;
    private String senderType;
    private Long senderId;
    private String senderName;
    private Boolean privateFlag;
    private String deliveryStatus;
    private String contentType;
    private Map<String, Object> contentAttributes;
    private LocalDateTime createdAt;
    private List<AttachmentResponse> attachments;

    public static MessageResponse fromMessage(Message message, String senderName) {
        // Determine content type from contentAttributes
        String contentType = "text";
        Map<String, Object> attrs = message.getContentAttributes();
        if (attrs != null && attrs.containsKey("contentType")) {
            contentType = String.valueOf(attrs.get("contentType"));
        }

        return MessageResponse.builder()
                .id(message.getId())
                .content(message.getContent())
                .messageType(message.getMessageType().name())
                .senderType(message.getSenderType() != null ? message.getSenderType().name() : null)
                .senderId(message.getSenderId())
                .senderName(senderName)
                .privateFlag(message.getPrivateFlag())
                .deliveryStatus(message.getDeliveryStatus())
                .contentType(contentType)
                .contentAttributes(attrs)
                .createdAt(message.getCreatedAt())
                .build();
    }

    public static MessageResponse fromMessage(Message message, String senderName, List<AttachmentResponse> attachments) {
        MessageResponse response = fromMessage(message, senderName);
        response.setAttachments(attachments);
        return response;
    }
}
