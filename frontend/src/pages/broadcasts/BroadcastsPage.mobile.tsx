// BroadcastsPage.mobile.tsx — mobile view of broadcast list + detail.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BroadcastResponse } from '../../api/broadcasts';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'var(--surface-3)', text: 'var(--ink-2)' },
  SCHEDULED: { bg: '#dbeafe', text: '#1d4ed8' },
  PROCESSING: { bg: '#fef3c7', text: 'var(--warn)' },
  COMPLETED: { bg: '#d1fae5', text: 'var(--ok)' },
  FAILED: { bg: '#fee2e2', text: 'var(--danger)' },
  CANCELLED: { bg: 'var(--surface-3)', text: 'var(--ink-4)' },
};

export interface MobileProps {
  broadcasts: BroadcastResponse[];
  selected: BroadcastResponse | null;
  setSelected: (b: BroadcastResponse | null) => void;
  error: string; setError: (s: string) => void;
  success: string; setSuccess: (s: string) => void;
  onStart: (id: number) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
}

const BroadcastsPageMobile: React.FC<MobileProps> = (p) => {
  const navigate = useNavigate();
  return (
    <div style={s.shell}>
      <div style={s.headerRow}>
        <div>
          <h2 style={s.title}>Broadcasts</h2>
          <p style={s.subtitle}>Send bulk WhatsApp messages</p>
        </div>
        <button onClick={() => navigate('/broadcasts/new')} style={s.primaryPill}>+ New</button>
      </div>

      {p.error && (
        <div style={s.errorBanner}>
          <span>{p.error}</span>
          <button onClick={() => p.setError('')} style={s.closeBtn}>×</button>
        </div>
      )}
      {p.success && (
        <div style={s.successBanner}>
          <span>{p.success}</span>
          <button onClick={() => p.setSuccess('')} style={s.closeBtn}>×</button>
        </div>
      )}

      {p.broadcasts.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📢</div>
          <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 15 }}>No broadcasts yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
            Tap “+ New” to send your first one
          </div>
        </div>
      ) : (
        <div style={s.list}>
          {p.broadcasts.map(b => (
            <BroadcastCard key={b.id} b={b} onOpen={p.setSelected}
              onStart={p.onStart} onCancel={p.onCancel} onDelete={p.onDelete} />
          ))}
        </div>
      )}

      {p.selected && <DetailSheet b={p.selected} onClose={() => p.setSelected(null)} />}
    </div>
  );
};

export default BroadcastsPageMobile;

const BroadcastCard: React.FC<{
  b: BroadcastResponse;
  onOpen: (b: BroadcastResponse) => void;
  onStart: (id: number) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ b, onOpen, onStart, onCancel, onDelete }) => {
  const sc = STATUS_COLORS[b.status] || STATUS_COLORS.DRAFT;
  const sentPct = b.totalCount ? (b.sentCount / b.totalCount) * 100 : 0;
  const failedPct = b.totalCount ? (b.failedCount / b.totalCount) * 100 : 0;
  const readPct = b.totalCount ? (b.readCount / b.totalCount) * 100 : 0;
  const deliveredPct = b.totalCount ? (b.deliveredCount / b.totalCount) * 100 : 0;
  return (
    <div style={s.card}>
      <button onClick={() => onOpen(b)} style={s.cardOpen}>
        <div style={s.cardTop}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.cardName}>{b.name}</div>
            <div style={s.cardMeta}>
              <span>{b.inboxName}</span>
              {b.templateName && <span> · {b.templateName}</span>}
            </div>
          </div>
          <span style={{ ...s.statusPill, background: sc.bg, color: sc.text }}>{b.status}</span>
        </div>
        <div style={s.progressInline}>
          {b.sentCount}/{b.totalCount} sent
          {b.deliveredCount > 0 && <span style={{ color: '#3b82f6' }}> · {b.deliveredCount} delivered</span>}
          {b.readCount > 0 && <span style={{ color: 'var(--ok)' }}> · {b.readCount} read</span>}
          {b.failedCount > 0 && <span style={{ color: 'var(--danger)' }}> · {b.failedCount} failed</span>}
        </div>
        {b.totalCount > 0 && (
          <div style={s.progressBar}>
            <div style={{ width: `${readPct}%`, background: 'var(--ok)', height: '100%' }} />
            <div style={{ width: `${deliveredPct}%`, background: '#3b82f6', height: '100%' }} />
            <div style={{ width: `${Math.max(0, sentPct - deliveredPct - readPct)}%`, background: '#93c5fd', height: '100%' }} />
            <div style={{ width: `${failedPct}%`, background: 'var(--danger)', height: '100%' }} />
          </div>
        )}
      </button>
      <div style={s.cardActions}>
        {(b.status === 'DRAFT' || b.status === 'SCHEDULED') && (
          <button onClick={() => onStart(b.id)} style={{ ...s.actionBtn, color: 'var(--ok)', borderColor: '#bbf7d0' }}>
            ▶ Start
          </button>
        )}
        {(b.status === 'DRAFT' || b.status === 'SCHEDULED' || b.status === 'PROCESSING') && (
          <button onClick={() => onCancel(b.id)} style={{ ...s.actionBtn, color: 'var(--warn)', borderColor: '#fde68a' }}>
            Cancel
          </button>
        )}
        <button onClick={() => onDelete(b.id)} style={{ ...s.actionBtn, color: 'var(--danger)', borderColor: '#fecaca' }}>
          Delete
        </button>
      </div>
    </div>
  );
};

const DetailSheet: React.FC<{ b: BroadcastResponse; onClose: () => void }> = ({ b, onClose }) => {
  const sc = STATUS_COLORS[b.status] || STATUS_COLORS.DRAFT;
  const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : '—';
  const stats = [
    { label: 'Total', value: b.totalCount, color: 'var(--ink-3)' },
    { label: 'Sent', value: b.sentCount, color: '#3b82f6' },
    { label: 'Delivered', value: b.deliveredCount, color: '#8b5cf6' },
    { label: 'Read', value: b.readCount, color: 'var(--ok)' },
    { label: 'Failed', value: b.failedCount, color: 'var(--danger)' },
    { label: 'Replied', value: b.repliedCount, color: 'var(--warn)' },
  ];
  return (
    <div onClick={onClose} style={s.sheetOverlay}>
      <div onClick={e => e.stopPropagation()} style={s.sheet}>
        <div style={s.sheetGrabber} />
        <div style={s.sheetHeader}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.name}
          </h2>
          <button onClick={onClose} style={s.sheetClose} aria-label="Close">×</button>
        </div>
        <div style={s.sheetBody}>
          <div style={s.statGrid}>
            {stats.map(st => (
              <div key={st.label} style={s.statCard}>
                <div style={{ fontSize: 22, fontWeight: 700, color: st.color }}>{st.value || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase' }}>{st.label}</div>
              </div>
            ))}
          </div>

          <div style={s.kvList}>
            <div style={s.kvRow}><span style={s.k}>Status</span><span style={{ ...s.statusPill, background: sc.bg, color: sc.text }}>{b.status}</span></div>
            <div style={s.kvRow}><span style={s.k}>Inbox</span><span style={s.v}>{b.inboxName}</span></div>
            <div style={s.kvRow}><span style={s.k}>Template</span><span style={s.v}>{b.templateName}</span></div>
            <div style={s.kvRow}><span style={s.k}>Created</span><span style={s.v}>{fmt(b.createdAt)}</span></div>
            {b.scheduledAt && <div style={s.kvRow}><span style={s.k}>Scheduled</span><span style={s.v}>{fmt(b.scheduledAt)}</span></div>}
            {b.startedAt && <div style={s.kvRow}><span style={s.k}>Started</span><span style={s.v}>{fmt(b.startedAt)}</span></div>}
            {b.completedAt && <div style={s.kvRow}><span style={s.k}>Completed</span><span style={s.v}>{fmt(b.completedAt)}</span></div>}
          </div>

          {b.description && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-2)', padding: 12, background: 'var(--surface-2)', borderRadius: 10 }}>
              {b.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  shell: { position: 'relative' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 8 },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' },
  subtitle: { margin: '2px 0 0', fontSize: 12, color: 'var(--ink-3)' },
  primaryPill: {
    height: 36, padding: '0 14px', borderRadius: 999, border: 0,
    background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  },

  errorBanner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fef2f2', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8,
    fontSize: 13, marginBottom: 10,
  },
  successBanner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#f0fdf4', color: 'var(--ok)', padding: '8px 12px', borderRadius: 8,
    fontSize: 13, marginBottom: 10,
  },
  closeBtn: { background: 'none', border: 0, cursor: 'pointer', fontSize: 18, color: 'inherit', padding: '0 4px' },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },

  card: {
    background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)',
    boxShadow: 'var(--sh-1)', overflow: 'hidden',
  },
  cardOpen: {
    width: '100%', textAlign: 'left', background: 'transparent', border: 0,
    padding: 14, cursor: 'pointer',
  },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  cardName: { fontWeight: 600, fontSize: 15, color: 'var(--ink)' },
  cardMeta: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 },
  statusPill: { padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, flexShrink: 0 },

  progressInline: { fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 },
  progressBar: {
    display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden',
    background: 'var(--surface-3)',
  },

  cardActions: {
    display: 'flex', gap: 6, padding: '0 14px 14px',
  },
  actionBtn: {
    flex: 1, height: 36, borderRadius: 8, border: '1px solid var(--line)',
    background: 'var(--surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },

  empty: { textAlign: 'center', padding: '60px 24px', color: 'var(--ink-4)' },

  // Sheet
  sheetOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(20,22,28,0.5)', zIndex: 100,
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', maxHeight: '92dvh', background: 'var(--surface)',
    borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  sheetGrabber: {
    width: 40, height: 5, borderRadius: 999, background: 'var(--surface-3)',
    margin: '8px auto 0',
  },
  sheetHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px 8px', gap: 10,
  },
  sheetClose: {
    width: 32, height: 32, borderRadius: '50%', border: 0, background: 'var(--surface-3)',
    display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)',
    fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0,
  },
  sheetBody: { flex: 1, overflowY: 'auto', padding: '4px 16px 16px' },

  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 },
  statCard: {
    textAlign: 'center', padding: 12, background: 'var(--surface-2)', borderRadius: 10,
  },

  kvList: { display: 'flex', flexDirection: 'column', gap: 6 },
  kvRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    padding: '6px 0', borderBottom: '1px solid var(--surface-3)', fontSize: 13,
  },
  k: { color: 'var(--ink-3)', fontWeight: 500, flexShrink: 0 },
  v: { color: 'var(--ink)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
};
