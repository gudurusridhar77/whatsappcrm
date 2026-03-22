package com.whatsappcrm.service;

import com.whatsappcrm.dto.CannedResponseDto;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.CannedResponse;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.CannedResponseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CannedResponseService {

    private final CannedResponseRepository cannedResponseRepository;
    private final AccountRepository accountRepository;

    public List<CannedResponseDto> getAll(Long accountId) {
        return cannedResponseRepository.findByAccountIdOrderByShortCodeAsc(accountId).stream()
                .map(CannedResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<CannedResponseDto> search(Long accountId, String query) {
        return cannedResponseRepository
                .findByAccountIdAndShortCodeContainingIgnoreCaseOrderByShortCodeAsc(accountId, query)
                .stream()
                .map(CannedResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    public CannedResponseDto getById(Long accountId, Long id) {
        CannedResponse cr = cannedResponseRepository.findByIdAndAccountId(id, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Canned response not found"));
        return CannedResponseDto.fromEntity(cr);
    }

    @Transactional
    public CannedResponseDto create(Long accountId, CannedResponseDto dto) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (cannedResponseRepository.existsByAccountIdAndShortCode(accountId, dto.getShortCode())) {
            throw new BadRequestException("A canned response with this short code already exists");
        }

        CannedResponse cr = CannedResponse.builder()
                .account(account)
                .shortCode(dto.getShortCode())
                .content(dto.getContent())
                .build();

        cr = cannedResponseRepository.save(cr);
        return CannedResponseDto.fromEntity(cr);
    }

    @Transactional
    public CannedResponseDto update(Long accountId, Long id, CannedResponseDto dto) {
        CannedResponse cr = cannedResponseRepository.findByIdAndAccountId(id, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Canned response not found"));

        if (StringUtils.hasText(dto.getShortCode()) && !dto.getShortCode().equals(cr.getShortCode())) {
            if (cannedResponseRepository.existsByAccountIdAndShortCode(accountId, dto.getShortCode())) {
                throw new BadRequestException("A canned response with this short code already exists");
            }
            cr.setShortCode(dto.getShortCode());
        }

        if (StringUtils.hasText(dto.getContent())) {
            cr.setContent(dto.getContent());
        }

        cr = cannedResponseRepository.save(cr);
        return CannedResponseDto.fromEntity(cr);
    }

    @Transactional
    public void delete(Long accountId, Long id) {
        CannedResponse cr = cannedResponseRepository.findByIdAndAccountId(id, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Canned response not found"));
        cannedResponseRepository.delete(cr);
    }
}
