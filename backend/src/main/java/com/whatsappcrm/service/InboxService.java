package com.whatsappcrm.service;

import com.whatsappcrm.dto.CreateInboxRequest;
import com.whatsappcrm.dto.InboxResponse;
import com.whatsappcrm.dto.UpdateInboxRequest;
import com.whatsappcrm.entity.*;
import com.whatsappcrm.enums.ChannelType;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InboxService {

    private final InboxRepository inboxRepository;
    private final AccountRepository accountRepository;
    private final ChannelWebWidgetRepository channelWebWidgetRepository;
    private final ChannelEmailRepository channelEmailRepository;
    private final ChannelWhatsappRepository channelWhatsappRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final CsatResponseRepository csatResponseRepository;

    public List<InboxResponse> getInboxes(Long accountId) {
        return inboxRepository.findByAccountId(accountId).stream()
                .map(this::toResponse)
                .toList();
    }

    public InboxResponse getInbox(Long accountId, Long inboxId) {
        Inbox inbox = inboxRepository.findByIdAndAccountId(inboxId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));
        return toResponse(inbox);
    }

    @Transactional
    public InboxResponse createInbox(Long accountId, CreateInboxRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        ChannelType channelType;
        try {
            channelType = ChannelType.valueOf(request.getChannelType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid channel type. Supported: WEB_WIDGET, API, EMAIL, WHATSAPP");
        }

        Inbox inbox = Inbox.builder()
                .account(account)
                .name(request.getName())
                .channelType(channelType)
                .greetingEnabled(request.getGreetingEnabled() != null ? request.getGreetingEnabled() : false)
                .greetingMessage(request.getGreetingMessage())
                .enableAutoAssignment(request.getEnableAutoAssignment() != null ? request.getEnableAutoAssignment() : true)
                .build();

        // Create channel-specific config
        if (channelType == ChannelType.WEB_WIDGET) {
            ChannelWebWidget widget = ChannelWebWidget.builder()
                    .websiteUrl(request.getWebsiteUrl())
                    .welcomeTitle(StringUtils.hasText(request.getWelcomeTitle()) ? request.getWelcomeTitle() : "Hi there!")
                    .welcomeTagline(StringUtils.hasText(request.getWelcomeTagline()) ? request.getWelcomeTagline() : "We make it simple to connect with us.")
                    .widgetColor(StringUtils.hasText(request.getWidgetColor()) ? request.getWidgetColor() : "#1b72e8")
                    .preChatFormEnabled(request.getPreChatFormEnabled() != null ? request.getPreChatFormEnabled() : false)
                    .build();
            widget = channelWebWidgetRepository.save(widget);
            inbox.setChannelId(String.valueOf(widget.getId()));
        } else if (channelType == ChannelType.EMAIL) {
            if (!StringUtils.hasText(request.getEmailAddress())) {
                throw new BadRequestException("Email address is required for EMAIL channel");
            }
            ChannelEmail email = ChannelEmail.builder()
                    .emailAddress(request.getEmailAddress())
                    .imapEnabled(StringUtils.hasText(request.getImapHost()))
                    .imapHost(request.getImapHost())
                    .imapPort(request.getImapPort() != null ? request.getImapPort() : 993)
                    .imapUsername(request.getImapUsername())
                    .imapPassword(request.getImapPassword())
                    .imapSsl(request.getImapSsl() != null ? request.getImapSsl() : true)
                    .smtpEnabled(StringUtils.hasText(request.getSmtpHost()))
                    .smtpHost(request.getSmtpHost())
                    .smtpPort(request.getSmtpPort() != null ? request.getSmtpPort() : 587)
                    .smtpUsername(request.getSmtpUsername())
                    .smtpPassword(request.getSmtpPassword())
                    .smtpTls(request.getSmtpTls() != null ? request.getSmtpTls() : true)
                    .forwardToEmail(request.getForwardToEmail())
                    .signature(request.getSignature())
                    .build();
            email = channelEmailRepository.save(email);
            inbox.setChannelId(String.valueOf(email.getId()));
        } else if (channelType == ChannelType.WHATSAPP) {
            if (!StringUtils.hasText(request.getWhatsappPhoneNumber())) {
                throw new BadRequestException("Phone number is required for WHATSAPP channel");
            }
            if (!StringUtils.hasText(request.getWhatsappPhoneNumberId())) {
                throw new BadRequestException("Phone Number ID is required for WHATSAPP channel");
            }
            if (!StringUtils.hasText(request.getWhatsappAccessToken())) {
                throw new BadRequestException("Access Token is required for WHATSAPP channel");
            }
            ChannelWhatsapp whatsapp = ChannelWhatsapp.builder()
                    .phoneNumber(request.getWhatsappPhoneNumber())
                    .phoneNumberId(request.getWhatsappPhoneNumberId())
                    .wabaId(request.getWhatsappWabaId())
                    .accessToken(request.getWhatsappAccessToken())
                    .businessName(request.getWhatsappBusinessName())
                    .apiBaseUrl(StringUtils.hasText(request.getWhatsappApiBaseUrl())
                            ? request.getWhatsappApiBaseUrl() : "https://graph.facebook.com/v21.0")
                    .build();
            whatsapp = channelWhatsappRepository.save(whatsapp);
            inbox.setChannelId(String.valueOf(whatsapp.getId()));
        }

        inbox = inboxRepository.save(inbox);
        return toResponse(inbox);
    }

    @Transactional
    public InboxResponse updateInbox(Long accountId, Long inboxId, UpdateInboxRequest request) {
        Inbox inbox = inboxRepository.findByIdAndAccountId(inboxId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        if (StringUtils.hasText(request.getName())) {
            inbox.setName(request.getName());
        }
        if (request.getGreetingEnabled() != null) {
            inbox.setGreetingEnabled(request.getGreetingEnabled());
        }
        if (request.getGreetingMessage() != null) {
            inbox.setGreetingMessage(request.getGreetingMessage());
        }
        if (request.getEnableAutoAssignment() != null) {
            inbox.setEnableAutoAssignment(request.getEnableAutoAssignment());
        }
        if (request.getActive() != null) {
            inbox.setActive(request.getActive());
        }

        // Update WebWidget config if applicable
        if (inbox.getChannelType() == ChannelType.WEB_WIDGET && inbox.getChannelId() != null) {
            ChannelWebWidget widget = channelWebWidgetRepository.findById(Long.parseLong(inbox.getChannelId()))
                    .orElse(null);
            if (widget != null) {
                if (StringUtils.hasText(request.getWebsiteUrl())) widget.setWebsiteUrl(request.getWebsiteUrl());
                if (StringUtils.hasText(request.getWelcomeTitle())) widget.setWelcomeTitle(request.getWelcomeTitle());
                if (StringUtils.hasText(request.getWelcomeTagline())) widget.setWelcomeTagline(request.getWelcomeTagline());
                if (StringUtils.hasText(request.getWidgetColor())) widget.setWidgetColor(request.getWidgetColor());
                if (request.getPreChatFormEnabled() != null) widget.setPreChatFormEnabled(request.getPreChatFormEnabled());
                channelWebWidgetRepository.save(widget);
            }
        }

        // Update Email config if applicable
        if (inbox.getChannelType() == ChannelType.EMAIL && inbox.getChannelId() != null) {
            ChannelEmail email = channelEmailRepository.findById(Long.parseLong(inbox.getChannelId())).orElse(null);
            if (email != null) {
                if (StringUtils.hasText(request.getEmailAddress())) email.setEmailAddress(request.getEmailAddress());
                if (StringUtils.hasText(request.getImapHost())) { email.setImapHost(request.getImapHost()); email.setImapEnabled(true); }
                if (request.getImapPort() != null) email.setImapPort(request.getImapPort());
                if (StringUtils.hasText(request.getImapUsername())) email.setImapUsername(request.getImapUsername());
                if (StringUtils.hasText(request.getImapPassword())) email.setImapPassword(request.getImapPassword());
                if (request.getImapSsl() != null) email.setImapSsl(request.getImapSsl());
                if (StringUtils.hasText(request.getSmtpHost())) { email.setSmtpHost(request.getSmtpHost()); email.setSmtpEnabled(true); }
                if (request.getSmtpPort() != null) email.setSmtpPort(request.getSmtpPort());
                if (StringUtils.hasText(request.getSmtpUsername())) email.setSmtpUsername(request.getSmtpUsername());
                if (StringUtils.hasText(request.getSmtpPassword())) email.setSmtpPassword(request.getSmtpPassword());
                if (request.getSmtpTls() != null) email.setSmtpTls(request.getSmtpTls());
                if (request.getForwardToEmail() != null) email.setForwardToEmail(request.getForwardToEmail());
                if (request.getSignature() != null) email.setSignature(request.getSignature());
                channelEmailRepository.save(email);
            }
        }

        // Update WhatsApp config if applicable
        if (inbox.getChannelType() == ChannelType.WHATSAPP && inbox.getChannelId() != null) {
            ChannelWhatsapp whatsapp = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId())).orElse(null);
            if (whatsapp != null) {
                if (StringUtils.hasText(request.getWhatsappPhoneNumber())) whatsapp.setPhoneNumber(request.getWhatsappPhoneNumber());
                if (StringUtils.hasText(request.getWhatsappPhoneNumberId())) whatsapp.setPhoneNumberId(request.getWhatsappPhoneNumberId());
                if (StringUtils.hasText(request.getWhatsappWabaId())) whatsapp.setWabaId(request.getWhatsappWabaId());
                if (StringUtils.hasText(request.getWhatsappAccessToken())) whatsapp.setAccessToken(request.getWhatsappAccessToken());
                if (StringUtils.hasText(request.getWhatsappBusinessName())) whatsapp.setBusinessName(request.getWhatsappBusinessName());
                if (StringUtils.hasText(request.getWhatsappApiBaseUrl())) whatsapp.setApiBaseUrl(request.getWhatsappApiBaseUrl());
                channelWhatsappRepository.save(whatsapp);
            }
        }

        inbox = inboxRepository.save(inbox);
        return toResponse(inbox);
    }

    @Transactional
    public void deleteInbox(Long accountId, Long inboxId) {
        Inbox inbox = inboxRepository.findByIdAndAccountId(inboxId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        // Delete all conversations and their dependencies (messages, CSAT, labels)
        List<Conversation> conversations = conversationRepository.findByInboxId(inboxId);
        for (Conversation conversation : conversations) {
            csatResponseRepository.deleteByConversationId(conversation.getId());
            messageRepository.deleteByConversationId(conversation.getId());
            conversation.getLabels().clear(); // remove join table entries
        }
        conversationRepository.deleteAll(conversations);

        // Delete channel config
        if (inbox.getChannelType() == ChannelType.WEB_WIDGET && inbox.getChannelId() != null) {
            channelWebWidgetRepository.deleteById(Long.parseLong(inbox.getChannelId()));
        } else if (inbox.getChannelType() == ChannelType.EMAIL && inbox.getChannelId() != null) {
            channelEmailRepository.deleteById(Long.parseLong(inbox.getChannelId()));
        } else if (inbox.getChannelType() == ChannelType.WHATSAPP && inbox.getChannelId() != null) {
            channelWhatsappRepository.deleteById(Long.parseLong(inbox.getChannelId()));
        }

        inboxRepository.delete(inbox);
    }

    private InboxResponse toResponse(Inbox inbox) {
        ChannelWebWidget widget = null;
        ChannelEmail email = null;
        ChannelWhatsapp whatsapp = null;
        if (inbox.getChannelType() == ChannelType.WEB_WIDGET && inbox.getChannelId() != null) {
            widget = channelWebWidgetRepository.findById(Long.parseLong(inbox.getChannelId())).orElse(null);
        } else if (inbox.getChannelType() == ChannelType.EMAIL && inbox.getChannelId() != null) {
            email = channelEmailRepository.findById(Long.parseLong(inbox.getChannelId())).orElse(null);
        } else if (inbox.getChannelType() == ChannelType.WHATSAPP && inbox.getChannelId() != null) {
            whatsapp = channelWhatsappRepository.findById(Long.parseLong(inbox.getChannelId())).orElse(null);
        }
        InboxResponse response = InboxResponse.fromInbox(inbox, widget, email, whatsapp);
        response.setConversationCount(conversationRepository.countByInboxId(inbox.getId()));
        return response;
    }
}
