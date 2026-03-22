package com.whatsappcrm.service;

import com.whatsappcrm.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.file-storage.upload-dir:uploads}")
    private String uploadDir;

    @Value("${app.file-storage.max-file-size-mb:10}")
    private int maxFileSizeMb;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            // Images
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp",
            // Documents
            "application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain", "text/csv",
            // Archives
            "application/zip", "application/x-rar-compressed", "application/gzip",
            // Audio
            "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
            // Video
            "video/mp4", "video/webm", "video/quicktime"
    );

    @PostConstruct
    public void init() {
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + uploadDir, e);
        }
    }

    /**
     * Store a file and return the relative path
     */
    public String storeFile(MultipartFile file, Long accountId) {
        validateFile(file);

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        // Create directory structure: uploads/account_{id}/yyyy-MM/
        String datePath = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        String dirPath = "account_" + accountId + "/" + datePath;
        String uniqueFileName = UUID.randomUUID().toString() + extension;
        String relativePath = dirPath + "/" + uniqueFileName;

        try {
            Path targetDir = Paths.get(uploadDir, dirPath);
            Files.createDirectories(targetDir);

            Path targetPath = targetDir.resolve(uniqueFileName);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            return relativePath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + originalFilename, e);
        }
    }

    /**
     * Load a file as byte array
     */
    public byte[] loadFile(String filePath) {
        try {
            Path path = Paths.get(uploadDir, filePath);
            if (!Files.exists(path)) {
                throw new BadRequestException("File not found: " + filePath);
            }
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file: " + filePath, e);
        }
    }

    /**
     * Delete a file
     */
    public void deleteFile(String filePath) {
        try {
            Path path = Paths.get(uploadDir, filePath);
            Files.deleteIfExists(path);
        } catch (IOException e) {
            // Log but don't throw - file deletion is best-effort
        }
    }

    /**
     * Store a file downloaded from a URL (e.g., WhatsApp media)
     */
    public String storeFileFromBytes(byte[] fileBytes, String fileName, String contentType, Long accountId) {
        String extension = "";
        if (fileName != null && fileName.contains(".")) {
            extension = fileName.substring(fileName.lastIndexOf("."));
        } else if (contentType != null) {
            // Derive extension from content type
            extension = switch (contentType) {
                case "image/jpeg" -> ".jpg";
                case "image/png" -> ".png";
                case "image/gif" -> ".gif";
                case "image/webp" -> ".webp";
                case "video/mp4" -> ".mp4";
                case "video/quicktime" -> ".mov";
                case "audio/mpeg" -> ".mp3";
                case "audio/ogg" -> ".ogg";
                case "audio/amr" -> ".amr";
                case "application/pdf" -> ".pdf";
                default -> "";
            };
        }

        String datePath = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        String dirPath = "account_" + accountId + "/" + datePath;
        String uniqueFileName = UUID.randomUUID().toString() + extension;
        String relativePath = dirPath + "/" + uniqueFileName;

        try {
            Path targetDir = Paths.get(uploadDir, dirPath);
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(uniqueFileName);
            Files.write(targetPath, fileBytes);
            return relativePath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store downloaded file: " + fileName, e);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        long maxSize = (long) maxFileSizeMb * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new BadRequestException("File size exceeds maximum of " + maxFileSizeMb + "MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("File type not allowed: " + contentType);
        }
    }
}
