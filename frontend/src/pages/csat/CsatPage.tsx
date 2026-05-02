import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { csatApi, CsatReportResponse, CsatSurveyResponse } from '../../api/csat';

const EMOJI_RATINGS = ['', '\uD83D\uDE21', '\uD83D\uDE1E', '\uD83D\uDE10', '\uD83D\uDE0A', '\uD83E\uDD29'];
const RATING_COLORS = ['', 'var(--danger)', '#f97316', '#eab308', 'var(--ok)', 'var(--ok)'];

const CsatPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [tab, setTab] = useState<'report' | 'responses'>('report');
  const [report, setReport] = useState<CsatReportResponse | null>(null);
  const [responses, setResponses] = useState<CsatSurveyResponse[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const res = await csatApi.getReport(currentAccountId);
      setReport(res.data);
    } catch { setError('Failed to load CSAT report'); }
    finally { setLoading(false); }
  }, [currentAccountId]);

  const loadResponses = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await csatApi.getResponses(currentAccountId);
      setResponses(res.data.content);
      setTotalResponses(res.data.totalElements);
    } catch { setError('Failed to load responses'); }
  }, [currentAccountId]);

  useEffect(() => { loadReport(); loadResponses(); }, [loadReport, loadResponses]);

  if (loading) return <div style={s.loading}>Loading CSAT data...</div>;

  return (
    <div>
      <div style={s.header}>
        <h2 style={s.title}>Customer Satisfaction</h2>
        <div style={s.tabs}>
          <button onClick={() => setTab('report')} style={{ ...s.tab, ...(tab === 'report' ? s.tabActive : {}) }}>Report</button>
          <button onClick={() => setTab('responses')} style={{ ...s.tab, ...(tab === 'responses' ? s.tabActive : {}) }}>Responses ({totalResponses})</button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {tab === 'report' && report && (
        <div>
          {/* Overview Cards */}
          <div style={s.cardGrid}>
            <div style={s.card}>
              <div style={{ ...s.cardValue, color: 'var(--accent)' }}>
                {report.averageRating != null ? `${report.averageRating}/5` : '-'}
              </div>
              <div style={s.cardLabel}>Avg Rating</div>
              {report.averageRating != null && (
                <div style={{ fontSize: '28px', marginTop: '4px' }}>
                  {EMOJI_RATINGS[Math.round(report.averageRating)]}
                </div>
              )}
            </div>
            <div style={s.card}>
              <div style={{ ...s.cardValue, color: 'var(--ok)' }}>
                {report.satisfactionScore != null ? `${report.satisfactionScore}%` : '-'}
              </div>
              <div style={s.cardLabel}>Satisfaction Score</div>
              <div style={s.cardSubtext}>% of Good + Excellent</div>
            </div>
            <div style={s.card}>
              <div style={{ ...s.cardValue, color: '#8b5cf6' }}>{report.totalResponses}</div>
              <div style={s.cardLabel}>Total Responses</div>
            </div>
            <div style={s.card}>
              <div style={{ ...s.cardValue, color: 'var(--warn)' }}>{report.pendingSurveys}</div>
              <div style={s.cardLabel}>Pending Surveys</div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div style={s.section}>
            <h4 style={s.sectionTitle}>Rating Distribution</h4>
            <div style={s.distContainer}>
              {report.distribution.map(d => (
                <div key={d.rating} style={s.distRow}>
                  <span style={s.distEmoji}>{EMOJI_RATINGS[d.rating]}</span>
                  <span style={s.distLabel}>{d.label}</span>
                  <div style={s.distBar}>
                    <div style={{ ...s.distFill, width: `${d.percentage}%`, backgroundColor: RATING_COLORS[d.rating] }} />
                  </div>
                  <span style={s.distCount}>{d.count} ({d.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Scores */}
          {report.agentScores.length > 0 && (
            <div style={s.section}>
              <h4 style={s.sectionTitle}>Agent Satisfaction Scores</h4>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Agent</th>
                    <th style={s.thNum}>Avg Rating</th>
                    <th style={s.thNum}>Emoji</th>
                  </tr>
                </thead>
                <tbody>
                  {report.agentScores.map(a => (
                    <tr key={a.agentId}>
                      <td style={s.td}>{a.agentName}</td>
                      <td style={s.tdNum}>{a.averageRating}/5</td>
                      <td style={{ ...s.tdNum, fontSize: '20px' }}>{EMOJI_RATINGS[Math.round(a.averageRating)]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'responses' && (
        <div style={s.section}>
          {responses.length === 0 ? (
            <div style={s.empty}>No CSAT responses yet. Surveys are sent when conversations are resolved.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Conv #</th>
                  <th style={s.th}>Contact</th>
                  <th style={s.th}>Agent</th>
                  <th style={s.thNum}>Rating</th>
                  <th style={s.th}>Feedback</th>
                  <th style={s.th}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {responses.map(r => (
                  <tr key={r.id}>
                    <td style={s.td}>#{r.conversationDisplayId}</td>
                    <td style={s.td}>{r.contactName}</td>
                    <td style={s.td}>{r.agentName || '-'}</td>
                    <td style={{ ...s.tdNum, fontSize: '18px' }}>
                      {EMOJI_RATINGS[r.rating]} <span style={{ fontSize: '13px', color: 'var(--ink-3)' }}>{r.ratingLabel}</span>
                    </td>
                    <td style={{ ...s.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.feedbackText || '-'}
                    </td>
                    <td style={s.td}>
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  loading: { textAlign: 'center', padding: '60px', color: 'var(--ink-4)' },
  error: { backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '22px', color: 'var(--ink)' },
  tabs: { display: 'flex', gap: '4px' },
  tab: { padding: '6px 14px', border: '1px solid var(--line)', borderRadius: '4px', backgroundColor: 'var(--surface)', cursor: 'pointer', fontSize: '13px', color: 'var(--ink-3)' },
  tabActive: { backgroundColor: 'var(--accent)', color: 'var(--surface)', borderColor: 'var(--accent)' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' },
  card: { backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' as const },
  cardValue: { fontSize: '28px', fontWeight: 700 },
  cardLabel: { fontSize: '12px', color: 'var(--ink-3)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginTop: '4px' },
  cardSubtext: { fontSize: '11px', color: '#aaa', marginTop: '2px' },
  section: { backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px' },
  sectionTitle: { margin: '0 0 16px 0', fontSize: '15px', color: 'var(--ink)' },
  distContainer: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  distRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  distEmoji: { fontSize: '20px', width: '28px', textAlign: 'center' as const },
  distLabel: { fontSize: '13px', color: '#555', width: '70px' },
  distBar: { flex: 1, height: '12px', backgroundColor: 'var(--surface-3)', borderRadius: '6px', overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: '6px', transition: 'width 0.5s' },
  distCount: { fontSize: '12px', color: 'var(--ink-4)', width: '90px', textAlign: 'right' as const },
  empty: { textAlign: 'center' as const, color: 'var(--ink-4)', padding: '40px', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid var(--line)', color: '#555', fontSize: '12px', fontWeight: 600 },
  thNum: { textAlign: 'center' as const, padding: '8px 12px', borderBottom: '2px solid var(--line)', color: '#555', fontSize: '12px', fontWeight: 600 },
  td: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', color: 'var(--ink)' },
  tdNum: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' as const },
};

export default CsatPage;
