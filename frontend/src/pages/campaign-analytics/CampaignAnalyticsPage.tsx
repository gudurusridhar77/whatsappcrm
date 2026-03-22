import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { campaignAnalyticsApi, AggregateMetrics, CampaignMetrics, DeliveryTrendPoint, TemplatePerformance, InboxCampaignMetrics } from '../../api/campaignAnalytics';

const CampaignAnalyticsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aggregate, setAggregate] = useState<AggregateMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignMetrics[]>([]);
  const [deliveryTrend, setDeliveryTrend] = useState<DeliveryTrendPoint[]>([]);
  const [templatePerformance, setTemplatePerformance] = useState<TemplatePerformance[]>([]);
  const [inboxBreakdown, setInboxBreakdown] = useState<InboxCampaignMetrics[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!currentAccountId) return;
    loadAnalytics();
  }, [currentAccountId, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const res = await campaignAnalyticsApi.getAnalytics(currentAccountId!, startStr, endStr);
      setAggregate(res.data.aggregate);
      setCampaigns(res.data.campaigns);
      setDeliveryTrend(res.data.deliveryTrend);
      setTemplatePerformance(res.data.templatePerformance);
      setInboxBreakdown(res.data.inboxBreakdown);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const sortedCampaigns = [...campaigns].sort((a: any, b: any) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIcon = (field: string) => {
    if (sortField !== field) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  // Simple bar chart renderer using divs
  const maxTrendValue = Math.max(1, ...deliveryTrend.map(p => Math.max(p.sent, p.delivered, p.read, p.failed)));

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading campaign analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ color: '#dc2626', fontSize: '16px', marginBottom: '12px' }}>{error}</div>
        <button onClick={loadAnalytics} style={styles.btn}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#111' }}>Campaign Analytics</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            Track broadcast performance and engagement metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: '#f0f0f0', borderRadius: '8px', padding: '3px' }}>
          {(['7d', '30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              style={{
                ...styles.rangeBtn,
                ...(dateRange === r ? styles.rangeBtnActive : {}),
              }}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {aggregate && (
        <>
          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <MetricCard label="Total Campaigns" value={aggregate.totalCampaigns} subtitle={`${aggregate.completedCampaigns} completed`} color="#1b72e8" />
            <MetricCard label="Total Recipients" value={aggregate.totalRecipients.toLocaleString()} subtitle={`${aggregate.totalSent.toLocaleString()} sent`} color="#8b5cf6" />
            <MetricCard label="Delivery Rate" value={`${aggregate.deliveryRate}%`} subtitle={`${aggregate.totalDelivered.toLocaleString()} delivered`} color="#22c55e" />
            <MetricCard label="Read Rate" value={`${aggregate.readRate}%`} subtitle={`${aggregate.totalRead.toLocaleString()} read`} color="#0ea5e9" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <MetricCard label="Reply Rate" value={`${aggregate.replyRate}%`} subtitle={`${aggregate.totalReplied.toLocaleString()} replied`} color="#f59e0b" />
            <MetricCard label="Failure Rate" value={`${aggregate.failureRate}%`} subtitle={`${aggregate.totalFailed.toLocaleString()} failed`} color="#ef4444" />
            <MetricCard label="Sent \u2192 Delivered Drop" value={`${aggregate.sentToDeliveredDropOff}%`} subtitle="drop-off rate" color="#f97316" />
            <MetricCard label="Avg Completion" value={aggregate.avgCompletionMinutes != null ? `${Math.round(aggregate.avgCompletionMinutes)} min` : 'N/A'} subtitle="campaign duration" color="#6366f1" />
          </div>

          {/* Delivery Funnel */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Delivery Funnel</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', padding: '20px 0' }}>
              {[
                { label: 'Recipients', value: aggregate.totalRecipients, color: '#e5e7eb' },
                { label: 'Sent', value: aggregate.totalSent, color: '#93c5fd' },
                { label: 'Delivered', value: aggregate.totalDelivered, color: '#86efac' },
                { label: 'Read', value: aggregate.totalRead, color: '#67e8f9' },
                { label: 'Replied', value: aggregate.totalReplied, color: '#fcd34d' },
              ].map((step, idx) => {
                const maxVal = Math.max(1, aggregate.totalRecipients);
                const height = Math.max(20, (step.value / maxVal) * 180);
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>{step.value.toLocaleString()}</span>
                    <div style={{
                      width: '100%', height: `${height}px`, backgroundColor: step.color,
                      borderRadius: '6px 6px 0 0', transition: 'height 0.3s ease',
                    }} />
                    <span style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>{step.label}</span>
                    {idx > 0 && (
                      <span style={{ fontSize: '11px', color: '#999' }}>
                        {aggregate.totalRecipients > 0 ? `${((step.value / aggregate.totalRecipients) * 100).toFixed(1)}%` : '0%'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Delivery Trend Chart */}
      {deliveryTrend.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Delivery Trend</h3>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <Legend color="#93c5fd" label="Sent" />
            <Legend color="#86efac" label="Delivered" />
            <Legend color="#67e8f9" label="Read" />
            <Legend color="#fca5a5" label="Failed" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '160px', overflow: 'hidden' }}>
            {deliveryTrend.map((point, idx) => {
              const barWidth = Math.max(4, Math.min(40, (900 / deliveryTrend.length) - 4));
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }} title={`${point.date}\nSent: ${point.sent} | Delivered: ${point.delivered} | Read: ${point.read} | Failed: ${point.failed}`}>
                  <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '140px' }}>
                    <div style={{ width: `${barWidth / 4}px`, height: `${(point.sent / maxTrendValue) * 140}px`, backgroundColor: '#93c5fd', borderRadius: '2px 2px 0 0' }} />
                    <div style={{ width: `${barWidth / 4}px`, height: `${(point.delivered / maxTrendValue) * 140}px`, backgroundColor: '#86efac', borderRadius: '2px 2px 0 0' }} />
                    <div style={{ width: `${barWidth / 4}px`, height: `${(point.read / maxTrendValue) * 140}px`, backgroundColor: '#67e8f9', borderRadius: '2px 2px 0 0' }} />
                    <div style={{ width: `${barWidth / 4}px`, height: `${(point.failed / maxTrendValue) * 140}px`, backgroundColor: '#fca5a5', borderRadius: '2px 2px 0 0' }} />
                  </div>
                  {deliveryTrend.length <= 31 && (
                    <span style={{ fontSize: '9px', color: '#999', marginTop: '4px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                      {point.date.slice(5)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Campaign Comparison Table */}
      {campaigns.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Campaign Performance ({campaigns.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th} onClick={() => handleSort('name')}>Campaign{sortIcon('name')}</th>
                  <th style={styles.th} onClick={() => handleSort('status')}>Status{sortIcon('status')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('totalCount')}>Recipients{sortIcon('totalCount')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('deliveryRate')}>Delivery{sortIcon('deliveryRate')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('readRate')}>Read{sortIcon('readRate')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('replyRate')}>Reply{sortIcon('replyRate')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('failureRate')}>Failed{sortIcon('failureRate')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }} onClick={() => handleSort('durationMinutes')}>Duration{sortIcon('durationMinutes')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: '#333' }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{c.templateName} &middot; {c.inboxName}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: c.status === 'COMPLETED' ? '#dcfce7' : c.status === 'IN_PROGRESS' ? '#dbeafe' : c.status === 'FAILED' ? '#fee2e2' : '#f3f4f6',
                        color: c.status === 'COMPLETED' ? '#166534' : c.status === 'IN_PROGRESS' ? '#1e40af' : c.status === 'FAILED' ? '#991b1b' : '#374151',
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{c.totalCount.toLocaleString()}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <RateBar value={c.deliveryRate} color="#22c55e" />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <RateBar value={c.readRate} color="#0ea5e9" />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <RateBar value={c.replyRate} color="#f59e0b" />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <RateBar value={c.failureRate} color="#ef4444" />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#666' }}>
                      {c.durationMinutes != null ? `${Math.round(c.durationMinutes)}m` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template Performance & Inbox Breakdown side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Template Performance */}
        {templatePerformance.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Template Performance</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Template</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Sent</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Delivery</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Read</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Reply</th>
                </tr>
              </thead>
              <tbody>
                {templatePerformance.map(t => (
                  <tr key={t.templateId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: '#333' }}>{t.templateName}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{t.category} &middot; {t.timesSent}x used</div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{t.totalRecipients.toLocaleString()}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{t.deliveryRate}%</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{t.readRate}%</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{t.replyRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Inbox Breakdown */}
        {inboxBreakdown.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Inbox Breakdown</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Inbox</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Campaigns</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Recipients</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Delivery</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Read</th>
                </tr>
              </thead>
              <tbody>
                {inboxBreakdown.map(ib => (
                  <tr key={ib.inboxId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: '#333' }}>{ib.inboxName}</div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{ib.campaignCount}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{ib.totalRecipients.toLocaleString()}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{ib.deliveryRate}%</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{ib.readRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Empty State */}
      {campaigns.length === 0 && !loading && (
        <div style={{ ...styles.card, textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
          <h3 style={{ margin: '0 0 8px', color: '#333' }}>No campaign data yet</h3>
          <p style={{ color: '#666', margin: 0 }}>
            Create and send broadcasts to see analytics here.
          </p>
        </div>
      )}
    </div>
  );
};

// Sub-components
const MetricCard: React.FC<{ label: string; value: string | number; subtitle: string; color: string }> = ({ label, value, subtitle, color }) => (
  <div style={styles.card}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <div style={{ width: '4px', height: '32px', backgroundColor: color, borderRadius: '2px' }} />
      <div>
        <div style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#111' }}>{value}</div>
      </div>
    </div>
    <div style={{ fontSize: '12px', color: '#888' }}>{subtitle}</div>
  </div>
);

const RateBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
    <div style={{ width: '60px', height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
    </div>
    <span style={{ fontSize: '13px', fontWeight: 500, color: '#333', minWidth: '42px', textAlign: 'right' }}>{value}%</span>
  </div>
);

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <div style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
    <span style={{ fontSize: '12px', color: '#666' }}>{label}</span>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px',
  },
  cardTitle: { margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#333' },
  btn: {
    padding: '8px 20px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
  },
  rangeBtn: {
    padding: '6px 14px', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 500,
    backgroundColor: 'transparent', color: '#666',
  },
  rangeBtnActive: {
    backgroundColor: '#fff', color: '#1b72e8', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: {
    textAlign: 'left' as const, padding: '10px 12px', borderBottom: '2px solid #e5e7eb',
    fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase' as const,
    cursor: 'pointer', whiteSpace: 'nowrap' as const, userSelect: 'none' as const,
  },
  td: { padding: '10px 12px', verticalAlign: 'middle' as const },
  statusBadge: {
    padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
};

export default CampaignAnalyticsPage;
