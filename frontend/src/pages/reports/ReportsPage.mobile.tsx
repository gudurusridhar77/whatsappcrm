// ReportsPage.mobile.tsx — mobile view for analytics dashboard.

import React from 'react';
import { ReportResponse } from '../../api/reports';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'var(--ok)', PENDING: 'var(--warn)',
  RESOLVED: 'var(--ink-3)', SNOOZED: '#8b5cf6',
};

export interface MobileProps {
  report: ReportResponse;
  startDate: string; setStartDate: (s: string) => void;
  endDate: string; setEndDate: (s: string) => void;
  formatMinutes: (m: number | null) => string;
}

const ReportsPageMobile: React.FC<MobileProps> = (p) => {
  const { overview, conversationTrend, messageTrend, agentPerformance,
    inboxBreakdown, statusDistribution, topLabels, teamPerformance } = p.report;
  const maxConv = Math.max(...conversationTrend.map(d => d.count), 1);
  const maxMsg = Math.max(...messageTrend.map(d => d.count), 1);

  return (
    <div style={s.shell}>
      <h2 style={s.title}>Reports & Analytics</h2>

      <div style={s.dateRow}>
        <input type="date" value={p.startDate} onChange={e => p.setStartDate(e.target.value)} style={s.dateInput} />
        <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>to</span>
        <input type="date" value={p.endDate} onChange={e => p.setEndDate(e.target.value)} style={s.dateInput} />
      </div>

      <div style={s.statGrid}>
        <Metric label="Conversations" value={overview.totalConversations} color="var(--accent)" />
        <Metric label="Messages" value={overview.totalMessages} color="#8b5cf6" />
        <Metric label="Open" value={overview.openConversations} color="var(--ok)" />
        <Metric label="Resolved" value={overview.resolvedConversations} color="var(--ink-3)" />
        <Metric label="Pending" value={overview.pendingConversations} color="var(--warn)" />
        <Metric label="Contacts" value={overview.totalContacts} color="#06b6d4" />
        <Metric label="Avg 1st response" value={p.formatMinutes(overview.avgFirstResponseMinutes)} color="#ec4899" small />
        <Metric label="Avg resolution" value={p.formatMinutes(overview.avgResolutionMinutes)} color="var(--warn)" small />
      </div>

      <Section title="Conversations over time">
        <BarChart data={conversationTrend} max={maxConv} color="var(--accent)" />
      </Section>

      <Section title="Messages over time">
        <BarChart data={messageTrend} max={maxMsg} color="#8b5cf6" />
      </Section>

      <Section title="Status distribution">
        {statusDistribution.length === 0 ? (
          <div style={s.empty}>No data</div>
        ) : statusDistribution.map(sc => {
          const total = statusDistribution.reduce((a, b) => a + b.count, 0) || 1;
          const pct = Math.round((sc.count / total) * 100);
          return (
            <div key={sc.status} style={s.distRow}>
              <span style={{ ...s.dot, background: STATUS_COLORS[sc.status] || 'var(--ink-4)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.distHead}>
                  <span style={s.distLabel}>{sc.status}</span>
                  <span style={s.distCount}>{sc.count} · {pct}%</span>
                </div>
                <div style={s.distBar}>
                  <div style={{ ...s.distFill, width: `${pct}%`, background: STATUS_COLORS[sc.status] || 'var(--ink-4)' }} />
                </div>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="Top labels">
        {topLabels.length === 0 ? (
          <div style={s.empty}>No labels used</div>
        ) : topLabels.map(l => (
          <div key={l.labelId} style={s.labelRow}>
            <span style={{ ...s.labelBadge, background: l.color || '#6366f1' }}>{l.labelTitle}</span>
            <span style={s.labelCount}>{l.count} convs</span>
          </div>
        ))}
      </Section>

      <Section title="Agent performance">
        {agentPerformance.length === 0 ? (
          <div style={s.empty}>No agent data</div>
        ) : agentPerformance.map(a => (
          <div key={a.agentId} style={s.agentCard}>
            <div style={s.agentName}>{a.agentName}</div>
            <div style={s.agentMetrics}>
              <Metric small label="Assigned" value={a.assignedConversations} color="var(--ink-2)" />
              <Metric small label="Resolved" value={a.resolvedConversations} color="var(--ok)" />
              <Metric small label="Sent" value={a.messagesSent} color="#8b5cf6" />
              <Metric small label="Avg resp" value={p.formatMinutes(a.avgFirstResponseMinutes)} color="var(--warn)" />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Inbox breakdown">
        {inboxBreakdown.length === 0 ? (
          <div style={s.empty}>No inbox data</div>
        ) : inboxBreakdown.map(ib => (
          <div key={ib.inboxId} style={s.inboxRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.inboxName}>{ib.inboxName}</div>
              <div style={s.inboxBadge}>{ib.channelType}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{ib.conversationCount}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{ib.messageCount} msgs</div>
            </div>
          </div>
        ))}
      </Section>

      {teamPerformance.length > 0 && (
        <Section title="Team performance">
          {teamPerformance.map(t => (
            <div key={t.teamId} style={s.inboxRow}>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{t.teamName}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t.assignedConversations} assigned</div>
                <div style={{ fontSize: 11, color: 'var(--ok)' }}>{t.resolvedConversations} resolved</div>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
};

export default ReportsPageMobile;

const Metric: React.FC<{ label: string; value: string | number; color: string; small?: boolean }> = ({ label, value, color, small }) => (
  <div style={s.metricCard}>
    <div style={{ fontSize: small ? 16 : 22, fontWeight: 700, color }}>{value}</div>
    <div style={s.metricLabel}>{label}</div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={s.section}>
    <h3 style={s.sectionTitle}>{title}</h3>
    {children}
  </div>
);

const BarChart: React.FC<{ data: { date: string; count: number }[]; max: number; color: string }> = ({ data, max, color }) => (
  <div style={s.chart}>
    {data.map((p, i) => (
      <div key={i} style={s.barCol} title={`${p.date}: ${p.count}`}>
        <div style={{
          width: '100%', minHeight: 2,
          height: `${(p.count / max) * 100}%`,
          background: color, borderRadius: '2px 2px 0 0',
        }} />
      </div>
    ))}
  </div>
);

const s: Record<string, React.CSSProperties> = {
  shell: { position: 'relative' },
  title: { margin: '0 0 14px', fontSize: 20, fontWeight: 700, color: 'var(--ink)' },

  dateRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
    background: 'var(--surface)', padding: 10, borderRadius: 10, border: '1px solid var(--line)',
  },
  dateInput: {
    flex: 1, height: 36, padding: '0 10px', border: '1px solid var(--line)',
    borderRadius: 8, fontSize: 13, background: 'var(--surface)',
  },

  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 },
  metricCard: {
    background: 'var(--surface)', padding: 14, borderRadius: 10,
    boxShadow: 'var(--sh-1)', textAlign: 'center', border: '1px solid var(--line)',
  },
  metricLabel: { fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 },

  section: {
    background: 'var(--surface)', padding: 14, borderRadius: 12,
    boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', marginBottom: 12,
  },
  sectionTitle: { margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)' },

  chart: {
    display: 'flex', alignItems: 'flex-end', gap: 2, height: 120,
    borderBottom: '1px solid var(--line)', paddingBottom: 4,
  },
  barCol: {
    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    height: '100%', minWidth: 4,
  },

  distRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  distHead: { display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 },
  distLabel: { color: 'var(--ink-2)', fontWeight: 500 },
  distCount: { color: 'var(--ink-4)' },
  distBar: { height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 4 },

  labelRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid var(--surface-3)',
  },
  labelBadge: {
    color: '#fff', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
  },
  labelCount: { fontSize: 12, color: 'var(--ink-4)' },

  agentCard: {
    padding: '10px 0', borderBottom: '1px solid var(--surface-3)',
  },
  agentName: { fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 },
  agentMetrics: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 },

  inboxRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid var(--surface-3)',
  },
  inboxName: { fontSize: 14, fontWeight: 600, color: 'var(--ink)' },
  inboxBadge: {
    display: 'inline-block', marginTop: 2, padding: '1px 6px', borderRadius: 4,
    background: 'var(--surface-3)', fontSize: 10, color: 'var(--ink-3)',
  },

  empty: { textAlign: 'center', padding: 16, color: 'var(--ink-4)', fontSize: 13 },
};
