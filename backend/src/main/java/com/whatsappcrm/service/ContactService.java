package com.whatsappcrm.service;

import com.whatsappcrm.dto.ContactImportResult;
import com.whatsappcrm.dto.ContactRequest;
import com.whatsappcrm.dto.ContactResponse;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.Contact;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.ContactRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactService {

    private final ContactRepository contactRepository;
    private final AccountRepository accountRepository;

    public Page<ContactResponse> getContacts(Long accountId, String search, Pageable pageable) {
        Page<Contact> contacts;
        if (StringUtils.hasText(search)) {
            contacts = contactRepository.search(accountId, search, pageable);
        } else {
            contacts = contactRepository.findByAccountId(accountId, pageable);
        }
        return contacts.map(ContactResponse::fromContact);
    }

    public ContactResponse getContact(Long accountId, Long contactId) {
        Contact contact = contactRepository.findByIdAndAccountId(contactId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
        return ContactResponse.fromContact(contact);
    }

    @Transactional
    public ContactResponse createContact(Long accountId, ContactRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (StringUtils.hasText(request.getEmail()) &&
                contactRepository.existsByAccountIdAndEmail(accountId, request.getEmail())) {
            throw new BadRequestException("A contact with this email already exists");
        }

        if (StringUtils.hasText(request.getPhoneNumber()) &&
                contactRepository.existsByAccountIdAndPhoneNumber(accountId, request.getPhoneNumber())) {
            throw new BadRequestException("A contact with this phone number already exists");
        }

        Contact contact = Contact.builder()
                .account(account)
                .name(request.getName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .company(request.getCompany())
                .description(request.getDescription())
                .customAttributes(request.getCustomAttributes() != null ? request.getCustomAttributes() : new java.util.HashMap<>())
                .build();

        contact = contactRepository.save(contact);
        return ContactResponse.fromContact(contact);
    }

    @Transactional
    public ContactResponse updateContact(Long accountId, Long contactId, ContactRequest request) {
        Contact contact = contactRepository.findByIdAndAccountId(contactId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));

        // Check email uniqueness if changed
        if (StringUtils.hasText(request.getEmail()) && !request.getEmail().equals(contact.getEmail()) &&
                contactRepository.existsByAccountIdAndEmail(accountId, request.getEmail())) {
            throw new BadRequestException("A contact with this email already exists");
        }

        // Check phone uniqueness if changed
        if (StringUtils.hasText(request.getPhoneNumber()) && !request.getPhoneNumber().equals(contact.getPhoneNumber()) &&
                contactRepository.existsByAccountIdAndPhoneNumber(accountId, request.getPhoneNumber())) {
            throw new BadRequestException("A contact with this phone number already exists");
        }

        contact.setName(request.getName());
        contact.setEmail(request.getEmail());
        contact.setPhoneNumber(request.getPhoneNumber());
        contact.setCompany(request.getCompany());
        contact.setDescription(request.getDescription());
        if (request.getCustomAttributes() != null) {
            contact.setCustomAttributes(request.getCustomAttributes());
        }

        contact = contactRepository.save(contact);
        return ContactResponse.fromContact(contact);
    }

    @Transactional
    public void deleteContact(Long accountId, Long contactId) {
        Contact contact = contactRepository.findByIdAndAccountId(contactId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
        contactRepository.delete(contact);
    }

    @Transactional
    public ContactImportResult importContacts(Long accountId, MultipartFile file) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        java.util.List<ContactImportResult.ImportError> errors = new ArrayList<>();
        int totalRows = 0, imported = 0, skipped = 0, failed = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new BadRequestException("CSV file is empty");
            }

            // Parse header — support: name, email, phone/phone_number, company, description
            String[] headers = parseCsvLine(headerLine);
            int nameIdx = -1, emailIdx = -1, phoneIdx = -1, companyIdx = -1, descIdx = -1;

            for (int i = 0; i < headers.length; i++) {
                String h = headers[i].trim().toLowerCase().replaceAll("[\"']", "");
                switch (h) {
                    case "name": case "full_name": case "fullname": case "contact_name":
                        nameIdx = i; break;
                    case "email": case "email_address": case "e-mail":
                        emailIdx = i; break;
                    case "phone": case "phone_number": case "phonenumber": case "mobile": case "whatsapp":
                        phoneIdx = i; break;
                    case "company": case "organization": case "org":
                        companyIdx = i; break;
                    case "description": case "notes": case "note":
                        descIdx = i; break;
                }
            }

            if (nameIdx == -1 && emailIdx == -1 && phoneIdx == -1) {
                throw new BadRequestException(
                        "CSV must have at least one of: name, email, phone columns. " +
                        "Found headers: " + headerLine);
            }

            String line;
            while ((line = reader.readLine()) != null) {
                totalRows++;
                if (line.trim().isEmpty()) { skipped++; continue; }

                try {
                    String[] fields = parseCsvLine(line);
                    String name = getField(fields, nameIdx);
                    String email = getField(fields, emailIdx);
                    String phone = getField(fields, phoneIdx);
                    String company = getField(fields, companyIdx);
                    String desc = getField(fields, descIdx);

                    // Name is required — fallback to email or phone
                    if (!StringUtils.hasText(name)) {
                        if (StringUtils.hasText(email)) name = email;
                        else if (StringUtils.hasText(phone)) name = phone;
                        else { skipped++; errors.add(new ContactImportResult.ImportError(totalRows, "", "No name, email, or phone")); continue; }
                    }

                    // Check for duplicates
                    if (StringUtils.hasText(email) && contactRepository.existsByAccountIdAndEmail(accountId, email)) {
                        skipped++;
                        errors.add(new ContactImportResult.ImportError(totalRows, name, "Duplicate email: " + email));
                        continue;
                    }
                    if (StringUtils.hasText(phone) && contactRepository.existsByAccountIdAndPhoneNumber(accountId, phone)) {
                        skipped++;
                        errors.add(new ContactImportResult.ImportError(totalRows, name, "Duplicate phone: " + phone));
                        continue;
                    }

                    Contact contact = Contact.builder()
                            .account(account)
                            .name(name)
                            .email(StringUtils.hasText(email) ? email : null)
                            .phoneNumber(StringUtils.hasText(phone) ? phone : null)
                            .company(StringUtils.hasText(company) ? company : null)
                            .description(StringUtils.hasText(desc) ? desc : null)
                            .customAttributes(new HashMap<>())
                            .build();
                    contactRepository.save(contact);
                    imported++;

                } catch (Exception e) {
                    failed++;
                    errors.add(new ContactImportResult.ImportError(totalRows, "", "Parse error: " + e.getMessage()));
                }
            }

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("CSV import failed: {}", e.getMessage());
            throw new BadRequestException("Failed to parse CSV: " + e.getMessage());
        }

        log.info("Contact import: {} total, {} imported, {} skipped, {} failed (account {})",
                totalRows, imported, skipped, failed, accountId);

        return ContactImportResult.builder()
                .totalRows(totalRows)
                .imported(imported)
                .skipped(skipped)
                .failed(failed)
                .errors(errors.size() > 50 ? errors.subList(0, 50) : errors)
                .build();
    }

    private String[] parseCsvLine(String line) {
        java.util.List<String> fields = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                fields.add(sb.toString().trim());
                sb = new StringBuilder();
            } else {
                sb.append(c);
            }
        }
        fields.add(sb.toString().trim());
        return fields.toArray(new String[0]);
    }

    private String getField(String[] fields, int index) {
        if (index < 0 || index >= fields.length) return null;
        String val = fields[index].trim().replaceAll("^\"|\"$", "");
        return val.isEmpty() ? null : val;
    }
}
