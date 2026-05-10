import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { broadcastsApi, BroadcastResponse } from '../../api/broadcasts';
import { useIsMobile } from '../../hooks/useIsMobile';
import BroadcastsPageMobile from './BroadcastsPage.mobile';

const BroadcastsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [broadcasts, setBroadcasts] = useState<BroadcastResponse[]>([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastResponse | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBroadcasts = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await broadcastsApi.getBroadcasts(currentAccountId);
      setBroadcasts(res.data);
    } catch {
      setError('Failed to load broadcasts');
    }
  }, [currentAccountId]);

  useEffect(() => { loadBroadcasts(); }, [loadBroadcasts]);

  // Show success banner when navigating back from the form page after a create.
  useEffect(() => {
    const state = location.state as { created?: boolean } | null;
    if (state?.created) {
      setSuccess('Broadcast created successfully!');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleStart = async (id: number) => {
    if (!currentAccountId || !window.confirm('Start sending this broadcast now?')) return;
    try {
      await broadcastsApi.startBroadcast(currentAccountId, id);
      setSuccess('Broadcast started! Messages are being sent.');
      loadBroadcasts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start broadcast');
    }
  };

  const handleCancel = async (id: number) => {
    if (!currentAccountId || !window.confirm('Cancel this broadcast?')) return;
    try {
      await broadcastsApi.cancelBroadcast(currentAccountId, id);
      loadBroadcasts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel broadcast');
    }
  };

  const handleDelete = async (id: number) => {
    if (!currentAccountId || !window.confirm('Delete this broadcast permanently?')) return;
    try {
      await broadcastsApi.deleteBroadcast(currentAccountId, id);
      if (selectedBroadcast?.id === id) setSelectedBroadcast(null);
      loadBroadcasts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete broadcast');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: 'var(--surface-3)', text: 'var(--ink-2)' },
      SCHEDULED: { bg: '#dbeafe', text: '#1d4ed8' },
      PROCESSING: { bg: '#fef3c7', text: 'var(--warn)' },
      COMPLETED: { bg: '#d1fae5', text: 'var(--ok)' },
      FAILED: { bg: '#fee2e2', text: 'var(--danger)' },
      CANCELLED: { bg: 'var(--surface-3)', text: 'var(--ink-4)' },
    };
    const c = colors[status] || colors.DRAFT;
    return (
      <span style={{
        padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
        backgroundColor: c.bg, color: c.text,
      }}>{status}</span>
    );
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '-';

  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <BroadcastsPageMobile
        broadcasts={broadcasts}
        selected={selectedBroadcast} setSelected={setSelectedBroadcast}
        error={error} setError={setError}
        success={success} setSuccess={setSuccess}
        onStart={handleStart} onCancel={handleCancel} onDelete={handleDelete}
      />
    );
  }

  const progressBar = (b: BroadcastResponse) => {
    if (!b.totalCount) return null;
    const sentPct = (b.sentCount / b.totalCount) * 100;
    const deliveredPct = (b.deliveredCount / b.totalCount) * 100;
    const readPct = (b.readCount / b.totalCount) * 100;
    const failedPct = (b.failedCount / b.totalCount) * 100;
    return (
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--surface-3)', marginTop: '8px' }}>
        <div style={{ width: `${readPct}%`, backgroundColor: 'var(--ok)' }} title={`Read: ${b.readCount}`} />
        <div style={{ width: `${deliveredPct}%`, backgroundColor: '#3b82f6' }} title={`Delivered: ${b.deliveredCount}`} />
        <div style={{ width: `${Math.max(0, sentPct - deliveredPct - readPct)}%`, backgroundColor: '#93c5fd' }} title={`Sent: ${b.sentCount}`} />
        <div style={{ width: `${failedPct}%`, backgroundColor: 'var(--danger)' }} title={`Failed: ${b.failedCount}`} />
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Broadcasts</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: '14px' }}>
            Send bulk WhatsApp messages using approved templates
          </p>
        </div>
        <button onClick={() => navigate('/broadcasts/new')} style={styles.primaryBtn}>+ New Broadcast</button>
      </div>

      {error && <div style={styles.errorBanner}>{error}<button onClick={() => setError('')} style={styles.closeBtnSmall}>&times;</button></div>}
      {success && <div style={styles.successBanner}>{success}<button onClick={() => setSuccess('')} style={styles.closeBtnSmall}>&times;</button></div>}

      {/* Broadcast Detail Panel */}
      {selectedBroadcast && (
        <div style={styles.detailPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedBroadcast.name}</h3>
            <button onClick={() => setSelectedBroadcast(null)} style={styles.closeBtnSmall}>&times;</button>
          </div>
          <div style={styles.statsGrid}>
            <StatCard label="Total" value={selectedBroadcast.totalCount} color="var(--ink-3)" />
            <StatCard label="Sent" value={selectedBroadcast.sentCount} color="#3b82f6" />
            <StatCard label="Delivered" value={selectedBroadcast.deliveredCount} color="#8b5cf6" />
            <StatCard label="Read" value={selectedBroadcast.readCount} color="var(--ok)" />
            <StatCard label="Failed" value={selectedBroadcast.failedCount} color="var(--danger)" />
            <StatCard label="Replied" value={selectedBroadcast.repliedCount} color="var(--warn)" />
          </div>
          {progressBar(selectedBroadcast)}
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--ink-3)' }}>
            <div><strong>Inbox:</strong> {selectedBroadcast.inboxName}</div>
            <div><strong>Template:</strong> {selectedBroadcast.templateName}</div>
            <div><strong>Status:</strong> {statusBadge(selectedBroadcast.status)}</div>
            {selectedBroadcast.description && <div style={{ marginTop: '8px' }}>{selectedBroadcast.description}</div>}
            <div style={{ marginTop: '8px' }}>
              <div><strong>Created:</strong> {formatDate(selectedBroadcast.createdAt)}</div>
              {selectedBroadcast.scheduledAt && <div><strong>Scheduled:</strong> {formatDate(selectedBroadcast.scheduledAt)}</div>}
              {selectedBroadcast.startedAt && <div><strong>Started:</strong> {formatDate(selectedBroadcast.startedAt)}</div>}
              {selectedBroadcast.completedAt && <div><strong>Completed:</strong> {formatDate(selectedBroadcast.completedAt)}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Broadcasts Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Template</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Progress</th>
            <th style={styles.th}>Created</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {broadcasts.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: 'var(--ink-4)', padding: '40px' }}>
                No broadcasts yet. Create your first broadcast to send bulk WhatsApp messages!
              </td>
            </tr>
          ) : (
            broadcasts.map(b => (
              <tr key={b.id} style={{ ...styles.tr, cursor: 'pointer', backgroundColor: selectedBroadcast?.id === b.id ? '#f8fafc' : undefined }}
                onClick={() => setSelectedBroadcast(b)}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 500 }}>{b.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{b.inboxName}</div>
                </td>
                <td style={styles.td}>
                  <span style={{ fontSize: '13px' }}>{b.templateName}</span>
                </td>
                <td style={styles.td}>{statusBadge(b.status)}</td>
                <td style={styles.td}>
                  <div style={{ fontSize: '13px' }}>
                    {b.sentCount}/{b.totalCount} sent
                    {b.deliveredCount > 0 && <span style={{ color: '#3b82f6' }}> · {b.deliveredCount} delivered</span>}
                    {b.readCount > 0 && <span style={{ color: 'var(--ok)' }}> · {b.readCount} read</span>}
                    {b.failedCount > 0 && <span style={{ color: 'var(--danger)' }}> · {b.failedCount} failed</span>}
                  </div>
                  {progressBar(b)}
                </td>
                <td style={styles.td}>{new Date(b.createdAt).toLocaleDateString()}</td>
                <td style={styles.td} onClick={e => e.stopPropagation()}>
                  {(b.status === 'DRAFT' || b.status === 'SCHEDULED') && (
                    <button onClick={() => handleStart(b.id)} style={{ ...styles.actionBtn, color: 'var(--ok)', borderColor: 'var(--ok)' }}>
                      ▶ Start
                    </button>
                  )}
                  {(b.status === 'DRAFT' || b.status === 'SCHEDULED' || b.status === 'PROCESSING') && (
                    <button onClick={() => handleCancel(b.id)} style={{ ...styles.actionBtn, color: 'var(--warn)' }}>
                      Cancel
                    </button>
                  )}
                  <button onClick={() => handleDelete(b.id)} style={{ ...styles.actionBtn, color: 'var(--danger)' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', padding: '8px' }}>
    <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value || 0}</div>
    <div style={{ fontSize: '11px', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{label}</div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'var(--surface)', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '20px',
  },
  title: { margin: 0, fontSize: '18px', color: 'var(--ink)' },
  primaryBtn: {
    padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  errorBanner: {
    backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '12px 16px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  successBanner: {
    backgroundColor: '#f0fdf4', color: 'var(--ok)', padding: '12px 16px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  closeBtnSmall: {
    background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer',
    color: 'var(--ink-3)', padding: '0 4px',
  },
  detailPanel: {
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
    padding: '16px', marginBottom: '20px',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    textAlign: 'left' as const, padding: '12px 8px', borderBottom: '2px solid var(--line)',
    fontSize: '13px', color: 'var(--ink-3)', textTransform: 'uppercase' as const,
  },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 8px', fontSize: '14px' },
  actionBtn: {
    padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid var(--line)',
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '4px',
    color: 'var(--ink)',
  },
};

export default BroadcastsPage;
