package com.whatsappcrm.service;

import com.whatsappcrm.dto.CampaignAnalyticsResponse;
import com.whatsappcrm.dto.CampaignAnalyticsResponse.*;
import com.whatsappcrm.entity.Broadcast;
import com.whatsappcrm.repository.BroadcastRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignAnalyticsService {

    private final BroadcastRepository broadcastRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public CampaignAnalyticsResponse getAnalytics(Long accountId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.plusDays(1).atStartOfDay();

        List<Broadcast> broadcasts = getBroadcastsInRange(accountId, start, end);

        return CampaignAnalyticsResponse.builder()
                .aggregate(buildAggregateMetrics(broadcasts, accountId, start, end))
                .campaigns(buildCampaignMetrics(broadcasts))
                .deliveryTrend(buildDeliveryTrend(accountId, start, end, startDate, endDate))
                .templatePerformance(buildTemplatePerformance(accountId, start, end))
                .inboxBreakdown(buildInboxBreakdown(accountId, start, end))
                .build();
    }

    @SuppressWarnings("unchecked")
    private List<Broadcast> getBroadcastsInRange(Long accountId, LocalDateTime start, LocalDateTime end) {
        return entityManager.createQuery(
                "SELECT b FROM Broadcast b WHERE b.account.id = :accountId " +
                "AND b.createdAt BETWEEN :start AND :end ORDER BY b.createdAt DESC")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();
    }

    private AggregateMetrics buildAggregateMetrics(List<Broadcast> broadcasts, Long accountId,
                                                     LocalDateTime start, LocalDateTime end) {
        long totalCampaigns = broadcasts.size();
        long completedCampaigns = broadcasts.stream()
                .filter(b -> b.getStatus() == Broadcast.BroadcastStatus.COMPLETED)
                .count();

        long totalRecipients = broadcasts.stream().mapToLong(b -> b.getTotalCount() != null ? b.getTotalCount() : 0).sum();
        long totalSent = broadcasts.stream().mapToLong(b -> b.getSentCount() != null ? b.getSentCount() : 0).sum();
        long totalDelivered = broadcasts.stream().mapToLong(b -> b.getDeliveredCount() != null ? b.getDeliveredCount() : 0).sum();
        long totalRead = broadcasts.stream().mapToLong(b -> b.getReadCount() != null ? b.getReadCount() : 0).sum();
        long totalFailed = broadcasts.stream().mapToLong(b -> b.getFailedCount() != null ? b.getFailedCount() : 0).sum();
        long totalReplied = broadcasts.stream().mapToLong(b -> b.getRepliedCount() != null ? b.getRepliedCount() : 0).sum();

        double deliveryRate = totalSent > 0 ? (totalDelivered * 100.0) / totalSent : 0;
        double readRate = totalDelivered > 0 ? (totalRead * 100.0) / totalDelivered : 0;
        double replyRate = totalDelivered > 0 ? (totalReplied * 100.0) / totalDelivered : 0;
        double failureRate = totalRecipients > 0 ? (totalFailed * 100.0) / totalRecipients : 0;

        double sentToDeliveredDropOff = totalSent > 0 ? ((totalSent - totalDelivered) * 100.0) / totalSent : 0;
        double deliveredToReadDropOff = totalDelivered > 0 ? ((totalDelivered - totalRead) * 100.0) / totalDelivered : 0;

        // Average completion time for completed campaigns
        Double avgCompletion = broadcasts.stream()
                .filter(b -> b.getStartedAt() != null && b.getCompletedAt() != null)
                .mapToLong(b -> ChronoUnit.MINUTES.between(b.getStartedAt(), b.getCompletedAt()))
                .average()
                .stream().findFirst().orElse(0.0);
        if (avgCompletion == 0.0 && broadcasts.stream().noneMatch(b -> b.getCompletedAt() != null)) {
            avgCompletion = null;
        }

        return AggregateMetrics.builder()
                .totalCampaigns(totalCampaigns)
                .completedCampaigns(completedCampaigns)
                .totalRecipients(totalRecipients)
                .totalSent(totalSent)
                .totalDelivered(totalDelivered)
                .totalRead(totalRead)
                .totalFailed(totalFailed)
                .totalReplied(totalReplied)
                .deliveryRate(round2(deliveryRate))
                .readRate(round2(readRate))
                .replyRate(round2(replyRate))
                .failureRate(round2(failureRate))
                .sentToDeliveredDropOff(round2(sentToDeliveredDropOff))
                .deliveredToReadDropOff(round2(deliveredToReadDropOff))
                .avgCompletionMinutes(avgCompletion)
                .build();
    }

    private List<CampaignMetrics> buildCampaignMetrics(List<Broadcast> broadcasts) {
        return broadcasts.stream().map(b -> {
            int sent = b.getSentCount() != null ? b.getSentCount() : 0;
            int delivered = b.getDeliveredCount() != null ? b.getDeliveredCount() : 0;
            int read = b.getReadCount() != null ? b.getReadCount() : 0;
            int failed = b.getFailedCount() != null ? b.getFailedCount() : 0;
            int replied = b.getRepliedCount() != null ? b.getRepliedCount() : 0;
            int total = b.getTotalCount() != null ? b.getTotalCount() : 0;

            Double durationMinutes = null;
            if (b.getStartedAt() != null && b.getCompletedAt() != null) {
                durationMinutes = (double) ChronoUnit.MINUTES.between(b.getStartedAt(), b.getCompletedAt());
            }

            return CampaignMetrics.builder()
                    .id(b.getId())
                    .name(b.getName())
                    .templateName(b.getTemplate() != null ? b.getTemplate().getName() : "N/A")
                    .inboxName(b.getInbox().getName())
                    .status(b.getStatus().name())
                    .totalCount(total)
                    .sentCount(sent)
                    .deliveredCount(delivered)
                    .readCount(read)
                    .failedCount(failed)
                    .repliedCount(replied)
                    .deliveryRate(sent > 0 ? round2((delivered * 100.0) / sent) : 0)
                    .readRate(delivered > 0 ? round2((read * 100.0) / delivered) : 0)
                    .replyRate(delivered > 0 ? round2((replied * 100.0) / delivered) : 0)
                    .failureRate(total > 0 ? round2((failed * 100.0) / total) : 0)
                    .startedAt(b.getStartedAt() != null ? b.getStartedAt().toString() : null)
                    .completedAt(b.getCompletedAt() != null ? b.getCompletedAt().toString() : null)
                    .createdAt(b.getCreatedAt() != null ? b.getCreatedAt().toString() : null)
                    .durationMinutes(durationMinutes)
                    .build();
        }).collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private List<TimeSeriesPoint> buildDeliveryTrend(Long accountId, LocalDateTime start, LocalDateTime end,
                                                      LocalDate startDate, LocalDate endDate) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT DATE(bc.sent_at) as d, " +
                "COUNT(CASE WHEN bc.status IN ('SENT','DELIVERED','READ') THEN 1 END) as sent, " +
                "COUNT(CASE WHEN bc.status IN ('DELIVERED','READ') THEN 1 END) as delivered, " +
                "COUNT(CASE WHEN bc.status = 'READ' THEN 1 END) as read_cnt, " +
                "COUNT(CASE WHEN bc.status = 'FAILED' THEN 1 END) as failed " +
                "FROM broadcast_contacts bc " +
                "JOIN broadcasts b ON b.id = bc.broadcast_id " +
                "WHERE b.account_id = :accountId AND bc.sent_at BETWEEN :start AND :end " +
                "GROUP BY DATE(bc.sent_at) ORDER BY d")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        Map<String, TimeSeriesPoint> map = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;
        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            String key = d.format(fmt);
            map.put(key, TimeSeriesPoint.builder().date(key).sent(0).delivered(0).read(0).failed(0).build());
        }

        for (Object[] row : results) {
            if (row[0] == null) continue;
            String date = row[0].toString();
            map.put(date, TimeSeriesPoint.builder()
                    .date(date)
                    .sent(((Number) row[1]).longValue())
                    .delivered(((Number) row[2]).longValue())
                    .read(((Number) row[3]).longValue())
                    .failed(((Number) row[4]).longValue())
                    .build());
        }

        return new ArrayList<>(map.values());
    }

    @SuppressWarnings("unchecked")
    private List<TemplatePerformance> buildTemplatePerformance(Long accountId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT t.id, t.name, t.category, " +
                "COUNT(DISTINCT b.id) as times_sent, " +
                "COALESCE(SUM(b.total_count), 0) as total_recipients, " +
                "COALESCE(SUM(b.delivered_count), 0) as total_delivered, " +
                "COALESCE(SUM(b.read_count), 0) as total_read, " +
                "COALESCE(SUM(b.replied_count), 0) as total_replied, " +
                "COALESCE(SUM(b.failed_count), 0) as total_failed " +
                "FROM whatsapp_templates t " +
                "JOIN broadcasts b ON b.template_id = t.id AND b.account_id = :accountId " +
                "AND b.created_at BETWEEN :start AND :end " +
                "WHERE t.account_id = :accountId " +
                "GROUP BY t.id, t.name, t.category " +
                "ORDER BY total_recipients DESC")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        List<TemplatePerformance> list = new ArrayList<>();
        for (Object[] row : results) {
            long totalRecipients = ((Number) row[4]).longValue();
            long totalDelivered = ((Number) row[5]).longValue();
            long totalRead = ((Number) row[6]).longValue();
            long totalReplied = ((Number) row[7]).longValue();

            list.add(TemplatePerformance.builder()
                    .templateId(((Number) row[0]).longValue())
                    .templateName((String) row[1])
                    .category((String) row[2])
                    .timesSent(((Number) row[3]).longValue())
                    .totalRecipients(totalRecipients)
                    .totalDelivered(totalDelivered)
                    .totalRead(totalRead)
                    .totalReplied(totalReplied)
                    .totalFailed(((Number) row[8]).longValue())
                    .deliveryRate(totalRecipients > 0 ? round2((totalDelivered * 100.0) / totalRecipients) : 0)
                    .readRate(totalDelivered > 0 ? round2((totalRead * 100.0) / totalDelivered) : 0)
                    .replyRate(totalDelivered > 0 ? round2((totalReplied * 100.0) / totalDelivered) : 0)
                    .build());
        }
        return list;
    }

    @SuppressWarnings("unchecked")
    private List<InboxCampaignMetrics> buildInboxBreakdown(Long accountId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT i.id, i.name, " +
                "COUNT(DISTINCT b.id) as campaign_count, " +
                "COALESCE(SUM(b.total_count), 0) as total_recipients, " +
                "COALESCE(SUM(b.delivered_count), 0) as total_delivered, " +
                "COALESCE(SUM(b.read_count), 0) as total_read, " +
                "COALESCE(SUM(b.replied_count), 0) as total_replied " +
                "FROM inboxes i " +
                "JOIN broadcasts b ON b.inbox_id = i.id AND b.account_id = :accountId " +
                "AND b.created_at BETWEEN :start AND :end " +
                "WHERE i.account_id = :accountId " +
                "GROUP BY i.id, i.name ORDER BY campaign_count DESC")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        List<InboxCampaignMetrics> list = new ArrayList<>();
        for (Object[] row : results) {
            long totalRecipients = ((Number) row[3]).longValue();
            long totalDelivered = ((Number) row[4]).longValue();
            long totalRead = ((Number) row[5]).longValue();

            list.add(InboxCampaignMetrics.builder()
                    .inboxId(((Number) row[0]).longValue())
                    .inboxName((String) row[1])
                    .campaignCount(((Number) row[2]).longValue())
                    .totalRecipients(totalRecipients)
                    .totalDelivered(totalDelivered)
                    .totalRead(totalRead)
                    .totalReplied(((Number) row[6]).longValue())
                    .deliveryRate(totalRecipients > 0 ? round2((totalDelivered * 100.0) / totalRecipients) : 0)
                    .readRate(totalDelivered > 0 ? round2((totalRead * 100.0) / totalDelivered) : 0)
                    .build());
        }
        return list;
    }

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
