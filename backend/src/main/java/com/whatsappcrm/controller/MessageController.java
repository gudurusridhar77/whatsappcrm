package com.whatsappcrm.controller;

import com.whatsappcrm.dto.MessageResponse;
import com.whatsappcrm.dto.SendMessageRequest;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.service.MessageService;
import com.whatsappcrm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/conversations/{conversationId}/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<MessageResponse>> getMessages(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            HttpServletRequest request) {
        PageRequest pageable = PageRequest.of(page, size);
        String baseUrl = getBaseUrl(request);
        return ResponseEntity.ok(messageService.getMessages(accountId, conversationId, pageable, baseUrl));
    }

    // JSON-only message (backward compatible)
    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestBody SendMessageRequest msgRequest,
            Authentication authentication,
            HttpServletRequest request) {
        Long currentUserId = getCurrentUserId(authentication);
        String baseUrl = getBaseUrl(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messageService.sendMessage(accountId, conversationId, currentUserId, msgRequest, null, baseUrl));
    }

    // Multipart message with file attachments
    @PostMapping(value = "/with-attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessageResponse> sendMessageWithAttachments(
            @PathVariable Long accountId,
            @PathVariable Long conversationId,
            @RequestParam(value = "content", required = false, defaultValue = "") String content,
            @RequestParam(value = "messageType", required = false) String messageType,
            @RequestParam(value = "privateFlag", required = false, defaultValue = "false") Boolean privateFlag,
            @RequestParam(value = "files", required = false) MultipartFile[] files,
            Authentication authentication,
            HttpServletRequest request) {

        Long currentUserId = getCurrentUserId(authentication);
        String baseUrl = getBaseUrl(request);

        SendMessageRequest msgRequest = new SendMessageRequest();
        msgRequest.setContent(content);
        msgRequest.setMessageType(messageType);
        msgRequest.setPrivateFlag(privateFlag);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messageService.sendMessage(accountId, conversationId, currentUserId, msgRequest, files, baseUrl));
    }

    private Long getCurrentUserId(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName());
        return user.getId();
    }

    private String getBaseUrl(HttpServletRequest request) {
        String scheme = request.getScheme();
        String host = request.getServerName();
        int port = request.getServerPort();
        if ((scheme.equals("http") && port == 80) || (scheme.equals("https") && port == 443)) {
            return scheme + "://" + host;
        }
        return scheme + "://" + host + ":" + port;
    }
}
