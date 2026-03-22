package com.whatsappcrm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "file_type", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FileType fileType = FileType.FILE;

    @Column(name = "thumb_path")
    private String thumbPath;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum FileType {
        IMAGE, VIDEO, AUDIO, FILE
    }

    /**
     * Derive file type from content type
     */
    public static FileType deriveFileType(String contentType) {
        if (contentType == null) return FileType.FILE;
        if (contentType.startsWith("image/")) return FileType.IMAGE;
        if (contentType.startsWith("video/")) return FileType.VIDEO;
        if (contentType.startsWith("audio/")) return FileType.AUDIO;
        return FileType.FILE;
    }
}
