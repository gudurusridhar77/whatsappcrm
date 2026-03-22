package com.whatsappcrm.service;

import com.whatsappcrm.dto.AttachmentResponse;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.Attachment;
import com.whatsappcrm.entity.Message;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final FileStorageService fileStorageService;

    /**
     * Save attachments for a message
     */
    public List<Attachment> saveAttachments(Message message, Account account, MultipartFile[] files) {
        if (files == null || files.length == 0) return Collections.emptyList();

        List<Attachment> attachments = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String filePath = fileStorageService.storeFile(file, account.getId());

            Attachment attachment = Attachment.builder()
                    .message(message)
                    .account(account)
                    .fileName(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .filePath(filePath)
                    .fileType(Attachment.deriveFileType(file.getContentType()))
                    .build();

            attachments.add(attachmentRepository.save(attachment));
        }

        return attachments;
    }

    /**
     * Save a single attachment from downloaded bytes (e.g., WhatsApp media)
     */
    public Attachment saveAttachmentFromBytes(Message message, Account account,
                                              byte[] fileBytes, String fileName,
                                              String contentType, long fileSize) {
        String filePath = fileStorageService.storeFileFromBytes(fileBytes, fileName, contentType, account.getId());

        Attachment attachment = Attachment.builder()
                .message(message)
                .account(account)
                .fileName(fileName != null ? fileName : "media")
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .fileSize(fileSize)
                .filePath(filePath)
                .fileType(Attachment.deriveFileType(contentType))
                .build();

        return attachmentRepository.save(attachment);
    }

    /**
     * Get attachments for a message
     */
    public List<AttachmentResponse> getAttachmentsForMessage(Long messageId, String baseUrl) {
        return attachmentRepository.findByMessageId(messageId).stream()
                .map(a -> AttachmentResponse.fromAttachment(a, baseUrl))
                .collect(Collectors.toList());
    }

    /**
     * Get attachments grouped by message ID (batch load for performance)
     */
    public Map<Long, List<AttachmentResponse>> getAttachmentsByMessageIds(List<Long> messageIds, String baseUrl) {
        if (messageIds == null || messageIds.isEmpty()) return Collections.emptyMap();

        return attachmentRepository.findByMessageIdIn(messageIds).stream()
                .collect(Collectors.groupingBy(
                        a -> a.getMessage().getId(),
                        Collectors.mapping(a -> AttachmentResponse.fromAttachment(a, baseUrl), Collectors.toList())
                ));
    }

    /**
     * Get attachment entity by ID
     */
    public Attachment getAttachment(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
    }

    /**
     * Load file bytes for download
     */
    public byte[] loadFileBytes(Long attachmentId) {
        Attachment attachment = getAttachment(attachmentId);
        return fileStorageService.loadFile(attachment.getFilePath());
    }
}
