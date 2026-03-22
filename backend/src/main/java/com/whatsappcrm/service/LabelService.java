package com.whatsappcrm.service;

import com.whatsappcrm.dto.CreateLabelRequest;
import com.whatsappcrm.dto.LabelResponse;
import com.whatsappcrm.dto.UpdateLabelRequest;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.Conversation;
import com.whatsappcrm.entity.Label;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.ConversationRepository;
import com.whatsappcrm.repository.LabelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LabelService {

    private final LabelRepository labelRepository;
    private final AccountRepository accountRepository;
    private final ConversationRepository conversationRepository;

    public List<LabelResponse> getLabels(Long accountId) {
        return labelRepository.findByAccountIdOrderByTitleAsc(accountId).stream()
                .map(label -> LabelResponse.fromLabel(label,
                        labelRepository.countConversationsByLabelId(label.getId(), accountId)))
                .collect(Collectors.toList());
    }

    public LabelResponse getLabel(Long accountId, Long labelId) {
        Label label = labelRepository.findByIdAndAccountId(labelId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Label not found"));
        long count = labelRepository.countConversationsByLabelId(labelId, accountId);
        return LabelResponse.fromLabel(label, count);
    }

    @Transactional
    public LabelResponse createLabel(Long accountId, CreateLabelRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (labelRepository.existsByAccountIdAndTitle(accountId, request.getTitle())) {
            throw new BadRequestException("A label with this title already exists");
        }

        Label label = Label.builder()
                .account(account)
                .title(request.getTitle())
                .description(request.getDescription())
                .color(request.getColor() != null ? request.getColor() : "#1b72e8")
                .showOnSidebar(request.getShowOnSidebar() != null ? request.getShowOnSidebar() : true)
                .build();

        label = labelRepository.save(label);
        return LabelResponse.fromLabel(label, 0L);
    }

    @Transactional
    public LabelResponse updateLabel(Long accountId, Long labelId, UpdateLabelRequest request) {
        Label label = labelRepository.findByIdAndAccountId(labelId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Label not found"));

        if (StringUtils.hasText(request.getTitle()) && !request.getTitle().equals(label.getTitle())) {
            if (labelRepository.existsByAccountIdAndTitle(accountId, request.getTitle())) {
                throw new BadRequestException("A label with this title already exists");
            }
            label.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            label.setDescription(request.getDescription());
        }
        if (request.getColor() != null) {
            label.setColor(request.getColor());
        }
        if (request.getShowOnSidebar() != null) {
            label.setShowOnSidebar(request.getShowOnSidebar());
        }

        label = labelRepository.save(label);
        long count = labelRepository.countConversationsByLabelId(labelId, accountId);
        return LabelResponse.fromLabel(label, count);
    }

    @Transactional
    public void deleteLabel(Long accountId, Long labelId) {
        Label label = labelRepository.findByIdAndAccountId(labelId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Label not found"));
        // Remove label from all conversations first
        label.getConversations().forEach(conv -> conv.getLabels().remove(label));
        labelRepository.delete(label);
    }

    // Conversation label management
    public List<LabelResponse> getConversationLabels(Long accountId, Long conversationId) {
        conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        return labelRepository.findByConversationId(conversationId).stream()
                .map(label -> LabelResponse.fromLabel(label, null))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<LabelResponse> setConversationLabels(Long accountId, Long conversationId, Set<Long> labelIds) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        Set<Label> labels;
        if (labelIds == null || labelIds.isEmpty()) {
            labels = new HashSet<>();
        } else {
            List<Label> foundLabels = labelRepository.findByIdInAndAccountId(labelIds, accountId);
            if (foundLabels.size() != labelIds.size()) {
                throw new BadRequestException("One or more labels not found");
            }
            labels = new HashSet<>(foundLabels);
        }

        conv.setLabels(labels);
        conversationRepository.save(conv);

        return labels.stream()
                .map(label -> LabelResponse.fromLabel(label, null))
                .collect(Collectors.toList());
    }
}
