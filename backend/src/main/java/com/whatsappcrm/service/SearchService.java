package com.whatsappcrm.service;

import com.whatsappcrm.dto.SearchResponse;
import com.whatsappcrm.entity.Contact;
import com.whatsappcrm.entity.Conversation;
import com.whatsappcrm.entity.Message;
import com.whatsappcrm.enums.SenderType;
import com.whatsappcrm.repository.ContactRepository;
import com.whatsappcrm.repository.ConversationRepository;
import com.whatsappcrm.repository.MessageRepository;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final ConversationRepository conversationRepository;
    private final ContactRepository contactRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public SearchResponse search(Long accountId, String query) {
        PageRequest limit = PageRequest.of(0, 10);

        // Search conversations
        List<Conversation> conversations = conversationRepository.searchConversations(accountId, query, limit);
        List<SearchResponse.ConversationResult> convResults = conversations.stream()
                .map(c -> SearchResponse.ConversationResult.builder()
                        .id(c.getId())
                        .displayId(c.getDisplayId())
                        .status(c.getStatus().name())
                        .contactName(c.getContact().getName())
                        .inboxName(c.getInbox().getName())
                        .assigneeName(c.getAssignee() != null ? c.getAssignee().getName() : null)
                        .teamName(c.getTeam() != null ? c.getTeam().getName() : null)
                        .lastMessage(null)
                        .createdAt(c.getCreatedAt() != null ? c.getCreatedAt().toString() : null)
                        .build())
                .collect(Collectors.toList());

        // Search contacts
        List<Contact> contacts = contactRepository.search(accountId, query, limit).getContent();
        List<SearchResponse.ContactResult> contactResults = contacts.stream()
                .map(c -> SearchResponse.ContactResult.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .email(c.getEmail())
                        .phoneNumber(c.getPhoneNumber())
                        .company(c.getCompany())
                        .build())
                .collect(Collectors.toList());

        // Search messages
        List<Message> messages = messageRepository.searchMessages(accountId, query, limit);
        List<SearchResponse.MessageResult> messageResults = messages.stream()
                .map(m -> {
                    String senderName = null;
                    if (m.getSenderType() == SenderType.USER && m.getSenderId() != null) {
                        senderName = userRepository.findById(m.getSenderId())
                                .map(u -> u.getName()).orElse("Unknown");
                    } else if (m.getSenderType() == SenderType.CONTACT && m.getSenderId() != null) {
                        senderName = m.getConversation().getContact().getName();
                    }
                    String content = m.getContent();
                    if (content != null && content.length() > 150) {
                        content = content.substring(0, 150) + "...";
                    }
                    return SearchResponse.MessageResult.builder()
                            .id(m.getId())
                            .conversationId(m.getConversation().getId())
                            .conversationDisplayId(m.getConversation().getDisplayId())
                            .contactName(m.getConversation().getContact().getName())
                            .content(content)
                            .senderName(senderName)
                            .createdAt(m.getCreatedAt() != null ? m.getCreatedAt().toString() : null)
                            .build();
                })
                .collect(Collectors.toList());

        return SearchResponse.builder()
                .conversations(convResults)
                .contacts(contactResults)
                .messages(messageResults)
                .build();
    }
}
