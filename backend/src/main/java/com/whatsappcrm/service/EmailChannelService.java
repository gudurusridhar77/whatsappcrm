package com.whatsappcrm.service;

import com.whatsappcrm.entity.*;
import com.whatsappcrm.enums.ChannelType;
import com.whatsappcrm.enums.MessageType;
import com.whatsappcrm.enums.SenderType;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailChannelService {

    private final InboxRepository inboxRepository;
    private final ChannelEmailRepository channelEmailRepository;
    private final ConversationRepository conversationRepository;
    private final ContactRepository contactRepository;
    private final MessageRepository messageRepository;
    private final AccountRepository accountRepository;
    private final WebSocketEventService webSocketEventService;

    /**
     * Send an email reply from a conversation
     */
    public void sendEmailReply(Long accountId, Long conversationId, String content, Long senderId) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        Inbox inbox = conv.getInbox();
        if (inbox.getChannelType() != ChannelType.EMAIL) {
            throw new BadRequestException("Conversation inbox is not an email channel");
        }

        ChannelEmail emailConfig = channelEmailRepository.findById(Long.parseLong(inbox.getChannelId()))
                .orElseThrow(() -> new ResourceNotFoundException("Email channel config not found"));

        if (!emailConfig.getSmtpEnabled()) {
            throw new BadRequestException("SMTP is not configured for this email inbox");
        }

        Contact contact = conv.getContact();
        if (contact.getEmail() == null || contact.getEmail().isEmpty()) {
            throw new BadRequestException("Contact does not have an email address");
        }

        try {
            JavaMailSender mailSender = createMailSender(emailConfig);

            String fullContent = content;
            if (emailConfig.getSignature() != null && !emailConfig.getSignature().isEmpty()) {
                fullContent += "\n\n--\n" + emailConfig.getSignature();
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(emailConfig.getEmailAddress());
            message.setTo(contact.getEmail());
            message.setSubject(conv.getSubject() != null ? "Re: " + conv.getSubject() : "Re: Conversation #" + conv.getDisplayId());
            message.setText(fullContent);

            mailSender.send(message);
            log.info("Email sent successfully to {} from conversation #{}", contact.getEmail(), conv.getDisplayId());

        } catch (Exception e) {
            log.error("Failed to send email for conversation #{}: {}", conv.getDisplayId(), e.getMessage());
            throw new BadRequestException("Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Process an incoming email (webhook or polling)
     */
    @Transactional
    public Conversation processIncomingEmail(Long inboxId, String fromEmail, String fromName,
                                              String subject, String body) {
        Inbox inbox = inboxRepository.findById(inboxId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        if (inbox.getChannelType() != ChannelType.EMAIL) {
            throw new BadRequestException("Inbox is not an email channel");
        }

        Long accountId = inbox.getAccount().getId();
        Account account = inbox.getAccount();

        // Find or create contact
        Contact contact = contactRepository.findByEmailAndAccountId(fromEmail, accountId)
                .orElseGet(() -> {
                    Contact newContact = Contact.builder()
                            .account(account)
                            .name(fromName != null ? fromName : fromEmail)
                            .email(fromEmail)
                            .build();
                    return contactRepository.save(newContact);
                });

        // Find existing open conversation or create new
        Conversation conversation = conversationRepository
                .findByAccountIdAndContactIdAndInboxIdAndStatus(accountId, contact.getId(), inboxId)
                .orElseGet(() -> {
                    Long nextDisplayId = conversationRepository.findMaxDisplayIdByAccountId(accountId) + 1;
                    Conversation newConv = Conversation.builder()
                            .account(account)
                            .inbox(inbox)
                            .contact(contact)
                            .displayId(nextDisplayId)
                            .subject(subject)
                            .lastActivityAt(LocalDateTime.now())
                            .build();
                    return conversationRepository.save(newConv);
                });

        // Create message
        Message message = Message.builder()
                .account(account)
                .conversation(conversation)
                .inbox(inbox)
                .content(body)
                .messageType(MessageType.INCOMING)
                .senderType(SenderType.CONTACT)
                .senderId(contact.getId())
                .build();
        messageRepository.save(message);

        conversation.setLastActivityAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        log.info("Processed incoming email from {} for conversation #{}", fromEmail, conversation.getDisplayId());
        return conversation;
    }

    /**
     * Test email connection
     */
    public boolean testSmtpConnection(Long accountId, Long inboxId) {
        Inbox inbox = inboxRepository.findByIdAndAccountId(inboxId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbox not found"));

        ChannelEmail emailConfig = channelEmailRepository.findById(Long.parseLong(inbox.getChannelId()))
                .orElseThrow(() -> new ResourceNotFoundException("Email config not found"));

        try {
            JavaMailSenderImpl mailSender = (JavaMailSenderImpl) createMailSender(emailConfig);
            mailSender.testConnection();
            return true;
        } catch (Exception e) {
            log.error("SMTP test failed: {}", e.getMessage());
            return false;
        }
    }

    private JavaMailSender createMailSender(ChannelEmail config) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getSmtpHost());
        mailSender.setPort(config.getSmtpPort());
        mailSender.setUsername(config.getSmtpUsername());
        mailSender.setPassword(config.getSmtpPassword());

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        if (config.getSmtpTls()) {
            props.put("mail.smtp.starttls.enable", "true");
        }
        if (config.getSmtpAuthentication()) {
            props.put("mail.smtp.auth", "true");
        }
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");

        return mailSender;
    }
}
