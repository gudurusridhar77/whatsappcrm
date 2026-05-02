import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { reportsApi, ReportResponse } from '../../api/reports';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'var(--ok)',
  PENDING: 'var(--warn)',
  RESOLVED: 'var(--ink-3)',
  SNOOZED: '#8b5cf6',
};

const ReportsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadReport = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    setError('');
    try {
      const res = await reportsApi.getReport(currentAccountId, startDate, endDate);
      setReport(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [currentAccountId, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const formatMinutes = (mins: number | null): string => {
    if (mins === null || mins === undefined) return '-';
    if (mins < 1) return '< 1m';
    if (mins < 60) return `${Math.round(mins)}m`;
    const hrs = Math.floor(mins / 60);
    const remaining = Math.round(mins % 60);
    return `${hrs}h ${remaining}m`;
  };

  if (loading) return <div style={s.loading}>Loading reports...</div>;
  if (error) return <div style={s.error}>{error}</div>;
  if (!report) return null;

  const { overview, conversationTrend, messageTrend, agentPerformance, inboxBreakdown, statusDistribution, topLabels, teamPerformance } = report;
  const maxTrendConv = Math.max(...conversationTrend.map(p => p.count), 1);
  const maxTrendMsg = Math.max(...messageTrend.map(p => p.count), 1);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Reports & Analytics</h2>
        <div style={s.dateRange}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={s.dateInput} />
          <span style={{ color: 'var(--ink-4)' }}>to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={s.dateInput} />
        </div>
      </div>

      {/* Overview Cards */}
      <div style={s.cardGrid}>
        <MetricCard label="Total Conversations" value={overview.totalConversations} color="var(--accent)" />
        <MetricCard label="Open" value={overview.openConversations} color="var(--ok)" />
        <MetricCard label="Resolved" value={overview.resolvedConversations} color="var(--ink-3)" />
        <MetricCard label="Pending" value={overview.pendingConversations} color="var(--warn)" />
        <MetricCard label="Total Messages" value={overview.totalMessages} color="#8b5cf6" />
        <MetricCard label="Total Contacts" value={overview.totalContacts} color="#06b6d4" />
        <MetricCard label="Avg First Response" value={formatMinutes(overview.avgFirstResponseMinutes)} color="#ec4899" />
        <MetricCard label="Avg Resolution" value={formatMinutes(overview.avgResolutionMinutes)} color="var(--warn)" />
      </div>

      {/* Charts Row */}
      <div style={s.row}>
        {/* Conversation Trend */}
        <div style={s.chartCard}>
          <h4 style={s.chartTitle}>Conversations Over Time</h4>
          <div style={s.barChart}>
            {conversationTrend.map((p, i) => (
              <div key={i} style={s.barCol} title={`${p.date}: ${p.count}`}>
                <div style={{ ...s.bar, height: `${(p.count / maxTrendConv) * 100}%`, backgroundColor: 'var(--accent)' }} />
                {conversationTrend.length <= 14 && (
                  <div style={s.barLabel}>{p.date.slice(5)}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Message Trend */}
        <div style={s.chartCard}>
          <h4 style={s.chartTitle}>Messages Over Time</h4>
          <div style={s.barChart}>
            {messageTrend.map((p, i) => (
              <div key={i} style={s.barCol} title={`${p.date}: ${p.count}`}>
                <div style={{ ...s.bar, height: `${(p.count / maxTrendMsg) * 100}%`, backgroundColor: '#8b5cf6' }} />
                {messageTrend.length <= 14 && (
                  <div style={s.barLabel}>{p.date.slice(5)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Distribution + Top Labels */}
      <div style={s.row}>
        <div style={s.chartCard}>
          <h4 style={s.chartTitle}>Status Distribution</h4>
          <div style={s.donutContainer}>
            {statusDistribution.map(sc => {
              const total = statusDistribution.reduce((a, b) => a + b.count, 0) || 1;
              const pct = Math.round((sc.count / total) * 100);
              return (
                <div key={sc.status} style={s.statusRow}>
                  <div style={{ ...s.statusDot, backgroundColor: STATUS_COLORS[sc.status] || 'var(--ink-4)' }} />
                  <span style={s.statusLabel}>{sc.status}</span>
                  <div style={s.statusBar}>
                    <div style={{ ...s.statusFill, width: `${pct}%`, backgroundColor: STATUS_COLORS[sc.status] || 'var(--ink-4)' }} />
                  </div>
                  <span style={s.statusCount}>{sc.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={s.chartCard}>
          <h4 style={s.chartTitle}>Top Labels</h4>
          {topLabels.length === 0 ? (
            <div style={s.empty}>No labels used yet</div>
          ) : (
            topLabels.map(l => (
              <div key={l.labelId} style={s.labelRow}>
                <span style={{ ...s.labelBadge, backgroundColor: l.color || '#6366f1' }}>{l.labelTitle}</span>
                <span style={s.labelCount}>{l.count} conversations</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Agent Performance */}
      <div style={s.chartCard}>
        <h4 style={s.chartTitle}>Agent Performance</h4>
        {agentPerformance.length === 0 ? (
          <div style={s.empty}>No agent data</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Agent</th>
                <th style={s.thNum}>Assigned</th>
                <th style={s.thNum}>Resolved</th>
                <th style={s.thNum}>Messages Sent</th>
                <th style={s.thNum}>Avg Response</th>
              </tr>
            </thead>
            <tbody>
              {agentPerformance.map(a => (
                <tr key={a.agentId}>
                  <td style={s.td}>{a.agentName}</td>
                  <td style={s.tdNum}>{a.assignedConversations}</td>
                  <td style={s.tdNum}>{a.resolvedConversations}</td>
                  <td style={s.tdNum}>{a.messagesSent}</td>
                  <td style={s.tdNum}>{formatMinutes(a.avgFirstResponseMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inbox Breakdown + Team Performance */}
      <div style={s.row}>
        <div style={s.chartCard}>
          <h4 style={s.chartTitle}>Inbox Breakdown</h4>
          {inboxBreakdown.length === 0 ? (
            <div style={s.empty}>No inbox data</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Inbox</th>
                  <th style={s.th}>Channel</th>
                  <th style={s.thNum}>Conversations</th>
                  <th style={s.thNum}>Messages</th>
                </tr>
              </thead>
              <tbody>
                {inboxBreakdown.map(ib => (
                  <tr key={ib.inboxId}>
                    <td style={s.td}>{ib.inboxName}</td>
                    <td style={s.td}><span style={s.channelBadge}>{ib.channelType}</span></td>
                    <td style={s.tdNum}>{ib.conversationCount}</td>
                    <td style={s.tdNum}>{ib.messageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={s.chartCard}>
          <h4 style={s.chartTitle}>Team Performance</h4>
          {teamPerformance.length === 0 ? (
            <div style={s.empty}>No team data</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Team</th>
                  <th style={s.thNum}>Assigned</th>
                  <th style={s.thNum}>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map(t => (
                  <tr key={t.teamId}>
                    <td style={s.td}>{t.teamName}</td>
                    <td style={s.tdNum}>{t.assignedConversations}</td>
                    <td style={s.tdNum}>{t.resolvedConversations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <div style={s.metricCard}>
    <div style={{ ...s.metricValue, color }}>{value}</div>
    <div style={s.metricLabel}>{label}</div>
  </div>
);

const s: Record<string, React.CSSProperties> = {
  container: { padding: '0', maxWidth: '1200px', margin: '0 auto' },
  loading: { textAlign: 'center', padding: '60px', color: 'var(--ink-4)', fontSize: '16px' },
  error: { backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '12px 20px', borderRadius: '8px', margin: '20px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, fontSize: '22px', color: 'var(--ink)' },
  dateRange: { display: 'flex', alignItems: 'center', gap: '8px' },
  dateInput: { padding: '6px 10px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '13px' },

  // Metric cards
  cardGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px',
  },
  metricCard: {
    backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' as const,
  },
  metricValue: { fontSize: '28px', fontWeight: 700, marginBottom: '4px' },
  metricLabel: { fontSize: '12px', color: 'var(--ink-3)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },

  // Row layout
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },

  // Chart card
  chartCard: {
    backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px',
  },
  chartTitle: { margin: '0 0 16px 0', fontSize: '15px', color: 'var(--ink)' },

  // Bar chart
  barChart: {
    display: 'flex', alignItems: 'flex-end', gap: '2px', height: '160px',
    borderBottom: '1px solid var(--line)', paddingBottom: '4px',
  },
  barCol: {
    flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'flex-end', height: '100%',
  },
  bar: {
    width: '100%', minHeight: '2px', borderRadius: '2px 2px 0 0', transition: 'height 0.3s',
  },
  barLabel: { fontSize: '9px', color: 'var(--ink-4)', marginTop: '4px', writingMode: 'vertical-lr' as const },

  // Status distribution
  donutContainer: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  statusDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  statusLabel: { fontSize: '13px', color: '#555', width: '70px' },
  statusBar: { flex: 1, height: '8px', backgroundColor: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' },
  statusFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
  statusCount: { fontSize: '12px', color: 'var(--ink-4)', width: '80px', textAlign: 'right' as const },

  // Labels
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' },
  labelBadge: { color: 'var(--surface)', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' },
  labelCount: { fontSize: '12px', color: 'var(--ink-4)' },

  // Table
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid var(--line)', color: '#555', fontSize: '12px', fontWeight: 600 },
  thNum: { textAlign: 'right' as const, padding: '8px 12px', borderBottom: '2px solid var(--line)', color: '#555', fontSize: '12px', fontWeight: 600 },
  td: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', color: 'var(--ink)' },
  tdNum: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' as const, color: 'var(--ink)', fontWeight: 500 },
  channelBadge: { backgroundColor: 'var(--surface-3)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' },
  empty: { textAlign: 'center' as const, color: 'var(--ink-4)', padding: '20px', fontSize: '13px' },
};

export default ReportsPage;
