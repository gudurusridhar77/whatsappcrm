package com.whatsappcrm.service;

import com.whatsappcrm.dto.CsatReportResponse;
import com.whatsappcrm.dto.CsatReportResponse.AgentCsat;
import com.whatsappcrm.dto.CsatReportResponse.RatingCount;
import com.whatsappcrm.dto.CsatSubmitRequest;
import com.whatsappcrm.dto.CsatSurveyResponse;
import com.whatsappcrm.entity.Conversation;
import com.whatsappcrm.entity.CsatResponse;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.AccountUserRepository;
import com.whatsappcrm.repository.ConversationRepository;
import com.whatsappcrm.repository.CsatResponseRepository;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CsatService {

    private final CsatResponseRepository csatRepository;
    private final ConversationRepository conversationRepository;
    private final AccountUserRepository accountUserRepository;
    private final UserRepository userRepository;

    private static final String[] RATING_LABELS = {"", "Awful", "Bad", "Neutral", "Good", "Excellent"};

    /**
     * Create a CSAT survey for a resolved conversation (returns the survey token)
     */
    @Transactional
    public String createSurvey(Long accountId, Long conversationId) {
        Conversation conv = conversationRepository.findByIdAndAccountId(conversationId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        // Check if survey already exists
        if (csatRepository.findByConversationId(conversationId).isPresent()) {
            throw new BadRequestException("CSAT survey already exists for this conversation");
        }

        String token = UUID.randomUUID().toString().replace("-", "");

        CsatResponse csat = CsatResponse.builder()
                .account(conv.getAccount())
                .conversation(conv)
                .contact(conv.getContact())
                .assignedAgent(conv.getAssignee())
                .rating(0)
                .surveyToken(token)
                .build();

        csatRepository.save(csat);
        return token;
    }

    /**
     * Submit a CSAT rating (public endpoint, authenticated by token)
     */
    @Transactional
    public CsatSurveyResponse submitSurvey(String token, CsatSubmitRequest request) {
        CsatResponse csat = csatRepository.findBySurveyToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Survey not found"));

        if (csat.getSubmittedAt() != null) {
            throw new BadRequestException("Survey already submitted");
        }

        csat.setRating(request.getRating());
        csat.setFeedbackText(request.getFeedbackText());
        csat.setSubmittedAt(LocalDateTime.now());
        csat = csatRepository.save(csat);

        return CsatSurveyResponse.fromEntity(csat);
    }

    /**
     * Get survey info by token (public)
     */
    public CsatSurveyResponse getSurveyByToken(String token) {
        CsatResponse csat = csatRepository.findBySurveyToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Survey not found"));
        return CsatSurveyResponse.fromEntity(csat);
    }

    /**
     * Get all submitted CSAT responses for an account
     */
    public Page<CsatSurveyResponse> getResponses(Long accountId, Long agentId, Pageable pageable) {
        if (agentId != null) {
            return csatRepository.findByAccountIdAndAssignedAgent_IdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(
                    accountId, agentId, pageable).map(CsatSurveyResponse::fromEntity);
        }
        return csatRepository.findByAccountIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(accountId, pageable)
                .map(CsatSurveyResponse::fromEntity);
    }

    /**
     * Get CSAT report/analytics
     */
    public CsatReportResponse getReport(Long accountId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime end = endDate != null ? endDate.plusDays(1).atStartOfDay() : LocalDate.now().plusDays(1).atStartOfDay();

        Double avgRating = csatRepository.getAverageRatingBetween(accountId, start, end);
        long totalResponses = csatRepository.countByAccountIdAndSubmittedAtIsNotNull(accountId);
        long pendingSurveys = csatRepository.countByAccountIdAndSurveyTokenIsNotNullAndSubmittedAtIsNull(accountId);

        // Rating distribution
        List<Object[]> distData = csatRepository.getRatingDistributionBetween(accountId, start, end);
        long totalInRange = distData.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();
        List<RatingCount> distribution = new ArrayList<>();
        long goodAndExcellent = 0;

        for (int rating = 1; rating <= 5; rating++) {
            long count = 0;
            for (Object[] row : distData) {
                if (((Number) row[0]).intValue() == rating) {
                    count = ((Number) row[1]).longValue();
                    break;
                }
            }
            if (rating >= 4) goodAndExcellent += count;
            distribution.add(RatingCount.builder()
                    .rating(rating)
                    .label(RATING_LABELS[rating])
                    .count(count)
                    .percentage(totalInRange > 0 ? Math.round((count * 100.0 / totalInRange) * 10) / 10.0 : 0)
                    .build());
        }

        Double satisfactionScore = totalInRange > 0 ? Math.round((goodAndExcellent * 100.0 / totalInRange) * 10) / 10.0 : null;

        // Agent scores
        List<AgentCsat> agentScores = new ArrayList<>();
        List<Long> agentIds = accountUserRepository.findUserIdsByAccountId(accountId);
        for (Long agentId : agentIds) {
            Double agentAvg = csatRepository.getAverageRatingByAgent(accountId, agentId);
            if (agentAvg != null) {
                String agentName = userRepository.findById(agentId).map(u -> u.getName()).orElse("Unknown");
                agentScores.add(AgentCsat.builder()
                        .agentId(agentId)
                        .agentName(agentName)
                        .averageRating(Math.round(agentAvg * 100) / 100.0)
                        .build());
            }
        }

        return CsatReportResponse.builder()
                .averageRating(avgRating != null ? Math.round(avgRating * 100) / 100.0 : null)
                .totalResponses(totalResponses)
                .pendingSurveys(pendingSurveys)
                .satisfactionScore(satisfactionScore)
                .distribution(distribution)
                .agentScores(agentScores)
                .build();
    }
}
