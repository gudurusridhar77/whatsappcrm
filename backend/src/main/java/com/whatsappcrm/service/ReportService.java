package com.whatsappcrm.service;

import com.whatsappcrm.dto.ReportResponse;
import com.whatsappcrm.dto.ReportResponse.*;
import com.whatsappcrm.enums.ConversationStatus;
import com.whatsappcrm.enums.MessageType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    @PersistenceContext
    private EntityManager entityManager;

    public ReportResponse generateReport(Long accountId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.plusDays(1).atStartOfDay();

        return ReportResponse.builder()
                .overview(getOverviewMetrics(accountId, start, end))
                .conversationTrend(getConversationTrend(accountId, start, end))
                .messageTrend(getMessageTrend(accountId, start, end))
                .agentPerformance(getAgentPerformance(accountId, start, end))
                .inboxBreakdown(getInboxBreakdown(accountId, start, end))
                .statusDistribution(getStatusDistribution(accountId))
                .topLabels(getTopLabels(accountId, start, end))
                .teamPerformance(getTeamPerformance(accountId, start, end))
                .build();
    }

    private OverviewMetrics getOverviewMetrics(Long accountId, LocalDateTime start, LocalDateTime end) {
        Long totalConv = querySingleLong(
                "SELECT COUNT(c) FROM Conversation c WHERE c.account.id = :accountId AND c.createdAt BETWEEN :start AND :end",
                accountId, start, end);
        Long openConv = querySingleLong(
                "SELECT COUNT(c) FROM Conversation c WHERE c.account.id = :accountId AND c.status = 'OPEN'",
                accountId, null, null);
        Long resolvedConv = querySingleLong(
                "SELECT COUNT(c) FROM Conversation c WHERE c.account.id = :accountId AND c.status = 'RESOLVED' AND c.updatedAt BETWEEN :start AND :end",
                accountId, start, end);
        Long pendingConv = querySingleLong(
                "SELECT COUNT(c) FROM Conversation c WHERE c.account.id = :accountId AND c.status = 'PENDING'",
                accountId, null, null);
        Long totalMessages = querySingleLong(
                "SELECT COUNT(m) FROM Message m WHERE m.account.id = :accountId AND m.createdAt BETWEEN :start AND :end",
                accountId, start, end);
        Long totalContacts = querySingleLong(
                "SELECT COUNT(c) FROM Contact c WHERE c.account.id = :accountId",
                accountId, null, null);

        Double avgFirstResponse = querySingleDouble(
                "SELECT AVG(EXTRACT(EPOCH FROM (c.firstReplyAt - c.createdAt)) / 60) FROM Conversation c " +
                "WHERE c.account.id = :accountId AND c.firstReplyAt IS NOT NULL AND c.createdAt BETWEEN :start AND :end",
                accountId, start, end);

        Double avgResolution = querySingleDouble(
                "SELECT AVG(EXTRACT(EPOCH FROM (c.updatedAt - c.createdAt)) / 60) FROM Conversation c " +
                "WHERE c.account.id = :accountId AND c.status = 'RESOLVED' AND c.updatedAt BETWEEN :start AND :end",
                accountId, start, end);

        return OverviewMetrics.builder()
                .totalConversations(totalConv != null ? totalConv : 0)
                .openConversations(openConv != null ? openConv : 0)
                .resolvedConversations(resolvedConv != null ? resolvedConv : 0)
                .pendingConversations(pendingConv != null ? pendingConv : 0)
                .totalMessages(totalMessages != null ? totalMessages : 0)
                .totalContacts(totalContacts != null ? totalContacts : 0)
                .avgFirstResponseMinutes(avgFirstResponse)
                .avgResolutionMinutes(avgResolution)
                .build();
    }

    @SuppressWarnings("unchecked")
    private List<TimeSeriesPoint> getConversationTrend(Long accountId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT DATE(created_at) as d, COUNT(*) as cnt FROM conversations " +
                "WHERE account_id = :accountId AND created_at BETWEEN :start AND :end " +
                "GROUP BY DATE(created_at) ORDER BY d")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        List<TimeSeriesPoint> points = new ArrayList<>();
        for (Object[] row : results) {
            points.add(TimeSeriesPoint.builder()
                    .date(row[0].toString())
                    .count(((Number) row[1]).longValue())
                    .build());
        }
        return fillMissingDates(points, start.toLocalDate(), end.toLocalDate().minusDays(1));
    }

    @SuppressWarnings("unchecked")
    private List<TimeSeriesPoint> getMessageTrend(Long accountId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT DATE(created_at) as d, COUNT(*) as cnt FROM messages " +
                "WHERE account_id = :accountId AND created_at BETWEEN :start AND :end " +
                "GROUP BY DATE(created_at) ORDER BY d")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        List<TimeSeriesPoint> points = new ArrayList<>();
        for (Object[] row : results) {
            points.add(TimeSeriesPoint.builder()
                    .date(row[0].toString())
                    .count(((Number) row[1]).longValue())
                    .build());
        }
        return fillMissingDates(points, start.toLocalDate(), end.toLocalDate().minusDays(1));
    }

    @SuppressWarnings("unchecked")
    private List<AgentMetrics> getAgentPerformance(Long accountId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT u.id, u.name, " +
                "COUNT(DISTINCT c.id) as assigned, " +
                "COUNT(DISTINCT CASE WHEN c.status = 'RESOLVED' THEN c.id END) as resolved, " +
                "COUNT(DISTINCT m.id) as messages_sent, " +
                "AVG(CASE WHEN c.first_reply_at IS NOT NULL THEN EXTRACT(EPOCH FROM (c.first_reply_at - c.created_at)) / 60 END) as avg_response " +
                "FROM users u " +
                "JOIN account_users au ON au.user_id = u.id AND au.account_id = :accountId " +
                "LEFT JOIN conversations c ON c.assignee_id = u.id AND c.account_id = :accountId AND c.created_at BETWEEN :start AND :end " +
                "LEFT JOIN messages m ON m.sender_id = u.id AND m.sender_type = 'USER' AND m.account_id = :accountId AND m.created_at BETWEEN :start AND :end " +
                "GROUP BY u.id, u.name ORDER BY assigned DESC")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        List<AgentMetrics> metrics = new ArrayList<>();
        for (Object[] row : results) {
            metrics.add(AgentMetrics.builder()
                    .agentId(((Number) row[0]).longValue())
                    .agentName((String) row[1])
                    .assignedConversations(((Number) row[2]).longValue())
                    .resolvedConversations(((Number) row[3]).longValue())
                    .messagesSent(((Number) row[4]).longValue())
                    .avgFirstResponseMinutes(row[5] != null ? ((Number) row[5]).doubleValue() : null)
                    .build());
        }
        return metrics;
    }

    @SuppressWarnings("unchecked")
    private List<InboxMetrics> getInboxBreakdown(Long accountId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT i.id, i.name, i.channel_type, " +
                "COUNT(DISTINCT c.id) as conv_count, " +
                "COUNT(DISTINCT m.id) as msg_count " +
                "FROM inboxes i " +
                "LEFT JOIN conversations c ON c.inbox_id = i.id AND c.created_at BETWEEN :start AND :end " +
                "LEFT JOIN messages m ON m.inbox_id = i.id AND m.created_at BETWEEN :start AND :end " +
                "WHERE i.account_id = :accountId " +
                "GROUP BY i.id, i.name, i.channel_type ORDER BY conv_count DESC")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        List<InboxMetrics> metrics = new ArrayList<>();
        for (Object[] row : results) {
            metrics.add(InboxMetrics.builder()
                    .inboxId(((Number) row[0]).longValue())
                    .inboxName((String) row[1])
                    .channelType((String) row[2])
                    .conversationCount(((Number) row[3]).longValue())
                    .messageCount(((Number) row[4]).longValue())
                    .build());
        }
        return metrics;
    }

    private List<StatusCount> getStatusDistribution(Long accountId) {
        List<StatusCount> counts = new ArrayList<>();
        for (ConversationStatus status : ConversationStatus.values()) {
            Long count = querySingleLong(
                    "SELECT COUNT(c) FROM Conversation c WHERE c.account.id = :accountId AND c.status = '" + status.name() + "'",
                    accountId, null, null);
            counts.add(StatusCount.builder()
                    .status(status.name())
                    .count(count != null ? count : 0)
                    .build());
        }
        return counts;
    }

    @SuppressWarnings("unchecked")
    private List<LabelCount> getTopLabels(Long accountId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT l.id, l.title, l.color, COUNT(cl.conversation_id) as cnt " +
                "FROM labels l " +
                "LEFT JOIN conversation_labels cl ON cl.label_id = l.id " +
                "LEFT JOIN conversations c ON c.id = cl.conversation_id AND c.created_at BETWEEN :start AND :end " +
                "WHERE l.account_id = :accountId " +
                "GROUP BY l.id, l.title, l.color ORDER BY cnt DESC LIMIT 10")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        List<LabelCount> counts = new ArrayList<>();
        for (Object[] row : results) {
            counts.add(LabelCount.builder()
                    .labelId(((Number) row[0]).longValue())
                    .labelTitle((String) row[1])
                    .color((String) row[2])
                    .count(((Number) row[3]).longValue())
                    .build());
        }
        return counts;
    }

    @SuppressWarnings("unchecked")
    private List<TeamMetrics> getTeamPerformance(Long accountId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = entityManager.createNativeQuery(
                "SELECT t.id, t.name, " +
                "COUNT(DISTINCT c.id) as assigned, " +
                "COUNT(DISTINCT CASE WHEN c.status = 'RESOLVED' THEN c.id END) as resolved " +
                "FROM teams t " +
                "LEFT JOIN conversations c ON c.team_id = t.id AND c.created_at BETWEEN :start AND :end " +
                "WHERE t.account_id = :accountId " +
                "GROUP BY t.id, t.name ORDER BY assigned DESC")
                .setParameter("accountId", accountId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getResultList();

        List<TeamMetrics> metrics = new ArrayList<>();
        for (Object[] row : results) {
            metrics.add(TeamMetrics.builder()
                    .teamId(((Number) row[0]).longValue())
                    .teamName((String) row[1])
                    .assignedConversations(((Number) row[2]).longValue())
                    .resolvedConversations(((Number) row[3]).longValue())
                    .build());
        }
        return metrics;
    }

    private Long querySingleLong(String jpql, Long accountId, LocalDateTime start, LocalDateTime end) {
        var query = entityManager.createQuery(jpql);
        query.setParameter("accountId", accountId);
        if (start != null && jpql.contains(":start")) query.setParameter("start", start);
        if (end != null && jpql.contains(":end")) query.setParameter("end", end);
        Object result = query.getSingleResult();
        return result != null ? ((Number) result).longValue() : 0L;
    }

    private Double querySingleDouble(String jpql, Long accountId, LocalDateTime start, LocalDateTime end) {
        var query = entityManager.createNativeQuery(jpql.replace("Conversation", "conversations")
                .replace("c.account.id", "account_id")
                .replace("c.firstReplyAt", "first_reply_at")
                .replace("c.createdAt", "created_at")
                .replace("c.updatedAt", "updated_at")
                .replace("c.status", "status"));
        // Use native query for EXTRACT functions
        try {
            var nq = entityManager.createNativeQuery(
                    jpql.contains("firstReplyAt") ?
                    "SELECT AVG(EXTRACT(EPOCH FROM (first_reply_at - created_at)) / 60) FROM conversations WHERE account_id = :accountId AND first_reply_at IS NOT NULL AND created_at BETWEEN :start AND :end" :
                    "SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) FROM conversations WHERE account_id = :accountId AND status = 'RESOLVED' AND updated_at BETWEEN :start AND :end"
            );
            nq.setParameter("accountId", accountId);
            nq.setParameter("start", start);
            nq.setParameter("end", end);
            Object result = nq.getSingleResult();
            return result != null ? ((Number) result).doubleValue() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private List<TimeSeriesPoint> fillMissingDates(List<TimeSeriesPoint> points, LocalDate start, LocalDate end) {
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;
        java.util.Map<String, Long> map = new java.util.LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            map.put(d.format(fmt), 0L);
        }
        for (TimeSeriesPoint p : points) {
            map.put(p.getDate(), p.getCount());
        }
        List<TimeSeriesPoint> filled = new ArrayList<>();
        map.forEach((date, count) -> filled.add(TimeSeriesPoint.builder().date(date).count(count).build()));
        return filled;
    }
}
