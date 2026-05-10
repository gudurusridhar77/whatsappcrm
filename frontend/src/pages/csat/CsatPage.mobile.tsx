// CsatPage.mobile.tsx — mobile view for CSAT report + responses.

import React from 'react';
import { CsatReportResponse, CsatSurveyResponse } from '../../api/csat';

const EMOJI_RATINGS = ['', '😡', '😞', '😐', '😊', '🤩'];
const RATING_COLORS = ['', 'var(--danger)', '#f97316', '#eab308', 'var(--ok)', 'var(--ok)'];

export interface MobileProps {
  tab: 'report' | 'responses';
  setTab: (t: 'report' | 'responses') => void;
  report: CsatReportResponse | null;
  responses: CsatSurveyResponse[];
  totalResponses: number;
  error: string;
}

const CsatPageMobile: React.FC<MobileProps> = ({ tab, setTab, report, responses, totalResponses, error }) => (
  <div style={s.shell}>
    <h2 style={s.title}>Customer Satisfaction</h2>

    <div style={s.tabs}>
      <button onClick={() => setTab('report')}
        style={{ ...s.tab, ...(tab === 'report' ? s.tabActive : {}) }}>Report</button>
      <button onClick={() => setTab('responses')}
        style={{ ...s.tab, ...(tab === 'responses' ? s.tabActive : {}) }}>
        Responses {totalResponses > 0 && <span style={s.tabCount}>{totalResponses}</span>}
      </button>
    </div>

    {error && <div style={s.error}>{error}</div>}

    {tab === 'report' && report && <ReportView report={report} />}
    {tab === 'responses' && <ResponsesView responses={responses} />}
  </div>
);

export default CsatPageMobile;

const ReportView: React.FC<{ report: CsatReportResponse }> = ({ report }) => (
  <>
    <div style={s.statGrid}>
      <Stat label="Avg rating"
        value={report.averageRating != null ? `${report.averageRating}/5` : '—'}
        color="var(--accent)"
        sub={report.averageRating != null ? EMOJI_RATINGS[Math.round(report.averageRating)] : undefined} />
      <Stat label="Satisfaction"
        value={report.satisfactionScore != null ? `${report.satisfactionScore}%` : '—'}
        color="var(--ok)"
        sub="Good + Excellent" />
      <Stat label="Responses" value={String(report.totalResponses)} color="#8b5cf6" />
      <Stat label="Pending" value={String(report.pendingSurveys)} color="var(--warn)" />
    </div>

    <Section title="Rating distribution">
      {report.distribution.map(d => (
        <div key={d.rating} style={s.distRow}>
          <span style={s.distEmoji}>{EMOJI_RATINGS[d.rating]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.distHead}>
              <span style={s.distLabel}>{d.label}</span>
              <span style={s.distCount}>{d.count} ({d.percentage}%)</span>
            </div>
            <div style={s.distBar}>
              <div style={{ ...s.distFill, width: `${d.percentage}%`, background: RATING_COLORS[d.rating] }} />
            </div>
          </div>
        </div>
      ))}
    </Section>

    {report.agentScores.length > 0 && (
      <Section title="Agent satisfaction">
        {report.agentScores.map(a => (
          <div key={a.agentId} style={s.agentRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{a.agentName}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{a.averageRating}/5</div>
            </div>
            <span style={{ fontSize: 24 }}>{EMOJI_RATINGS[Math.round(a.averageRating)]}</span>
          </div>
        ))}
      </Section>
    )}
  </>
);

const ResponsesView: React.FC<{ responses: CsatSurveyResponse[] }> = ({ responses }) => (
  responses.length === 0 ? (
    <div style={s.empty}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
      <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 15 }}>No CSAT responses yet</div>
      <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
        Surveys are sent when conversations are resolved
      </div>
    </div>
  ) : (
    <div style={s.list}>
      {responses.map(r => (
        <div key={r.id} style={s.respCard}>
          <div style={s.respTop}>
            <span style={{ fontSize: 22 }}>{EMOJI_RATINGS[r.rating]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.respHead}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{r.contactName}</span>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>#{r.conversationDisplayId}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {r.ratingLabel} · {r.agentName || 'Unassigned'}
                {r.submittedAt && ` · ${new Date(r.submittedAt).toLocaleDateString()}`}
              </div>
            </div>
          </div>
          {r.feedbackText && (
            <div style={s.feedback}>“{r.feedbackText}”</div>
          )}
        </div>
      ))}
    </div>
  )
);

const Stat: React.FC<{ label: string; value: string; color: string; sub?: string }> = ({ label, value, color, sub }) => (
  <div style={s.statCard}>
    <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 18, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={s.section}>
    <h3 style={s.sectionTitle}>{title}</h3>
    {children}
  </div>
);

const s: Record<string, React.CSSProperties> = {
  shell: { position: 'relative' },
  title: { margin: '0 0 14px', fontSize: 20, fontWeight: 700, color: 'var(--ink)' },

  tabs: { display: 'flex', gap: 6, marginBottom: 14 },
  tab: {
    flex: 1, height: 38, borderRadius: 999, border: '1px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  tabActive: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
  tabCount: {
    marginLeft: 6, background: 'rgba(255,255,255,0.25)', padding: '1px 7px', borderRadius: 999, fontSize: 11,
  },

  error: { background: '#fef2f2', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 },

  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 },
  statCard: {
    background: 'var(--surface)', borderRadius: 12, padding: 14,
    boxShadow: 'var(--sh-1)', textAlign: 'center', border: '1px solid var(--line)',
  },

  section: {
    background: 'var(--surface)', borderRadius: 12, padding: 14,
    boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', marginBottom: 12,
  },
  sectionTitle: { margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)' },

  distRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' },
  distEmoji: { fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 },
  distHead: { display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 },
  distLabel: { color: 'var(--ink-2)', fontWeight: 500 },
  distCount: { color: 'var(--ink-4)' },
  distBar: { height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 4 },

  agentRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
    borderBottom: '1px solid var(--surface-3)',
  },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  respCard: {
    background: 'var(--surface)', borderRadius: 12, padding: 14,
    boxShadow: 'var(--sh-1)', border: '1px solid var(--line)',
  },
  respTop: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  respHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  feedback: {
    marginTop: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 8,
    fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic', lineHeight: 1.4,
  },

  empty: { textAlign: 'center', padding: '60px 24px', color: 'var(--ink-4)' },
};
