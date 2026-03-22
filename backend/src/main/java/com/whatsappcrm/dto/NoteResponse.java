package com.whatsappcrm.dto;

import com.whatsappcrm.entity.Note;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class NoteResponse {
    private Long id;
    private String content;
    private Long userId;
    private String userName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static NoteResponse fromNote(Note note) {
        return NoteResponse.builder()
                .id(note.getId())
                .content(note.getContent())
                .userId(note.getUser().getId())
                .userName(note.getUser().getName())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}
