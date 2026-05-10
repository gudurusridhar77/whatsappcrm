// DashboardPage.mobile.tsx
// Mobile presentation for the Dashboard / Team page.
// Receives data + handlers as props from DashboardPage.tsx.
// Layout: availability summary row, then member cards, with invite via bottom sheet.

import React from 'react';
import { AccountUser } from '../../types';

const availabilityColors: Record<string, string> = {
  ONLINE: 'var(--ok)',
  BUSY: 'var(--warn)',
  OFFLINE: 'var(--ink-4)',
};

export interface MobileProps {
  members: AccountUser[];
  currentUserId?: number;
  isAdmin: boolean;
  error: string;

  showInvite: boolean;
  setShowInvite: (b: boolean) => void;
  inviteName: string; setInviteName: (s: string) => void;
  inviteEmail: string; setInviteEmail: (s: string) => void;
  inviteRole: string; setInviteRole: (s: string) => void;
  onInvite: (e: React.FormEvent) => void;

  onRoleChange: (userId: number, newRole: string) => void;
  onRemove: (userId: number) => void;
}

const DashboardPageMobile: React.FC<MobileProps> = (p) => {
  const online = p.members.filter(m => m.availability === 'ONLINE').length;
  const busy = p.members.filter(m => m.availability === 'BUSY').length;
  const offline = p.members.filter(m => m.availability === 'OFFLINE' || !m.availability).length;

  const summary = [
    { label: 'Online', count: online, color: 'var(--ok)', bg: '#f0fdf4' },
    { label: 'Busy', count: busy, color: 'var(--warn)', bg: '#fffbeb' },
    { label: 'Offline', count: offline, color: 'var(--ink-4)', bg: 'var(--surface-2)' },
  ];

  return (
    <div style={s.shell}>
      <div style={s.summaryRow}>
        {summary.map(c => (
          <div key={c.label} style={{ ...s.summaryCard, background: c.bg, borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.count}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>Team Members</h2>
        {p.isAdmin && (
          <button onClick={() => p.setShowInvite(true)} style={s.invitePill}>+ Invite</button>
        )}
      </div>

      {p.error && <div style={s.error}>{p.error}</div>}

      <div style={s.list}>
        {p.members.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 15 }}>No team members yet</div>
            {p.isAdmin && (
              <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
                Tap “Invite” to add your first teammate
              </div>
            )}
          </div>
        ) : p.members.map(m => (
          <MemberCard key={m.id} m={m}
            isSelf={m.userId === p.currentUserId}
            isAdmin={p.isAdmin}
            onRoleChange={p.onRoleChange}
            onRemove={p.onRemove} />
        ))}
      </div>

      {p.showInvite && <InviteSheet {...p} />}
    </div>
  );
};

export default DashboardPageMobile;

// ──────────────────────────────────────────────────────────────
// MEMBER CARD
// ──────────────────────────────────────────────────────────────

const MemberCard: React.FC<{
  m: AccountUser; isSelf: boolean; isAdmin: boolean;
  onRoleChange: (userId: number, newRole: string) => void;
  onRemove: (userId: number) => void;
}> = ({ m, isSelf, isAdmin, onRoleChange, onRemove }) => {
  const status = m.availability || 'OFFLINE';
  const isAdminRole = m.role === 'ADMIN';
  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div style={s.avatarWrap}>
          <Avatar name={m.displayName || m.userName} />
          <span style={{ ...s.presence, background: availabilityColors[status] }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.nameRow}>
            <span style={s.name}>{m.userName}</span>
            {isSelf && <span style={s.selfBadge}>You</span>}
          </div>
          <div style={s.email}>{m.email}</div>
        </div>
      </div>

      <div style={s.badgeRow}>
        <span style={{
          ...s.statusPill,
          background: status === 'ONLINE' ? '#f0fdf4' : status === 'BUSY' ? '#fffbeb' : 'var(--surface-2)',
          color: availabilityColors[status],
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: availabilityColors[status] }} />
          {status}
        </span>
        <span style={{
          ...s.rolePill,
          background: isAdminRole ? '#dbeafe' : 'var(--surface-3)',
          color: isAdminRole ? '#1d4ed8' : 'var(--ink-2)',
        }}>{m.role}</span>
        {m.invitationStatus && m.invitationStatus !== 'ACCEPTED' && (
          <span style={s.inviteStatusPill}>{m.invitationStatus}</span>
        )}
      </div>

      {isAdmin && !isSelf && (
        <div style={s.actions}>
          <button onClick={() => onRoleChange(m.userId, isAdminRole ? 'AGENT' : 'ADMIN')}
            style={s.actionBtn}>
            Make {isAdminRole ? 'Agent' : 'Admin'}
          </button>
          <button onClick={() => onRemove(m.userId)} style={{ ...s.actionBtn, ...s.actionDanger }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// INVITE SHEET
// ──────────────────────────────────────────────────────────────

const InviteSheet: React.FC<MobileProps> = (p) => (
  <Sheet title="Invite teammate" onClose={() => p.setShowInvite(false)}
    footer={
      <>
        <button type="button" onClick={() => p.setShowInvite(false)} style={s.btnSecondary}>Cancel</button>
        <button type="submit" form="mobile-invite-form"
          disabled={!p.inviteName.trim() || !p.inviteEmail.trim()}
          style={{ ...s.btnPrimary, ...(p.inviteName.trim() && p.inviteEmail.trim() ? {} : { opacity: 0.5 }) }}>
          Send invite
        </button>
      </>
    }>
    <form id="mobile-invite-form" onSubmit={p.onInvite}>
      <Group title="Name">
        <input type="text" value={p.inviteName} onChange={e => p.setInviteName(e.target.value)}
          placeholder="Jane Doe" style={s.input} required />
      </Group>
      <Group title="Email">
        <input type="email" value={p.inviteEmail} onChange={e => p.setInviteEmail(e.target.value)}
          placeholder="jane@company.com" style={s.input} required />
      </Group>
      <Group title="Role">
        <select value={p.inviteRole} onChange={e => p.setInviteRole(e.target.value)} style={s.input}>
          <option value="AGENT">Agent — handles conversations</option>
          <option value="ADMIN">Admin — full access</option>
        </select>
      </Group>
    </form>
  </Sheet>
);

// ──────────────────────────────────────────────────────────────
// ATOMS
// ──────────────────────────────────────────────────────────────

const Sheet: React.FC<{
  title: string; onClose: () => void;
  footer?: React.ReactNode; children: React.ReactNode;
}> = ({ title, onClose, footer, children }) => (
  <div onClick={onClose} style={s.sheetOverlay}>
    <div onClick={e => e.stopPropagation()} style={s.sheet}>
      <div style={s.sheetGrabber} />
      <div style={s.sheetHeader}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} style={s.sheetClose} aria-label="Close">×</button>
      </div>
      <div style={s.sheetBody}>{children}</div>
      {footer && <div style={s.sheetFooter}>{footer}</div>}
    </div>
  </div>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={s.groupLabel}>{title}</label>
    {children}
  </div>
);

const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const palette: [string, string][] = [
    ['#eef2ff', '#4f46e5'], ['#fef3c7', '#b45309'],
    ['#dcfce7', '#16a34a'], ['#fce7f3', '#be185d'],
    ['#e0f2fe', '#0369a1'], ['#fee2e2', '#b91c1c'],
  ];
  const seed = (name || '?').charCodeAt(0) + (name || '').length;
  const idx = seed % palette.length;
  const [bg, fg] = palette[idx];
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', background: bg, color: fg,
      display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
};

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  shell: { position: 'relative' },

  summaryRow: { display: 'flex', gap: 8, marginBottom: 16 },
  summaryCard: {
    flex: 1, padding: '12px 14px', borderRadius: 10, minWidth: 0,
  },

  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, padding: '0 2px',
  },
  sectionTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)' },
  invitePill: {
    height: 36, padding: '0 14px', borderRadius: 999, border: 0,
    background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },

  card: {
    background: 'var(--surface)', borderRadius: 12, padding: 14,
    border: '1px solid var(--line)', boxShadow: 'var(--sh-1)',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative', width: 40, height: 40, flexShrink: 0 },
  presence: {
    position: 'absolute', bottom: -1, right: -1, width: 11, height: 11,
    borderRadius: '50%', border: '2px solid var(--surface)',
  },
  nameRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontWeight: 600, fontSize: 15, color: 'var(--ink)' },
  selfBadge: {
    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
    background: 'var(--accent-soft)', color: 'var(--accent)',
  },
  email: {
    fontSize: 12, color: 'var(--ink-3)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },

  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
  },
  rolePill: {
    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
  },
  inviteStatusPill: {
    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
    background: '#fef3c7', color: '#92400e',
  },

  actions: { display: 'flex', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1, height: 40, borderRadius: 8, border: '1px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  actionDanger: { color: 'var(--danger)', borderColor: '#fecaca' },

  empty: { textAlign: 'center', padding: '60px 24px', color: 'var(--ink-4)' },

  error: {
    background: '#fef2f2', color: 'var(--danger)', padding: '8px 12px',
    borderRadius: 8, marginBottom: 12, fontSize: 13,
  },

  // Sheet
  sheetOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(20,22,28,0.5)', zIndex: 100,
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', maxHeight: '92dvh',
    background: 'var(--surface)', borderRadius: '20px 20px 0 0',
    display: 'flex', flexDirection: 'column',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  sheetGrabber: {
    width: 40, height: 5, borderRadius: 999, background: 'var(--surface-3)',
    margin: '8px auto 0',
  },
  sheetHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px',
  },
  sheetClose: {
    width: 32, height: 32, borderRadius: '50%', border: 0, background: 'var(--surface-3)',
    display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)',
    fontSize: 18, lineHeight: 1, padding: 0,
  },
  sheetBody: { flex: 1, overflowY: 'auto', padding: '4px 16px 16px' },
  sheetFooter: { borderTop: '1px solid var(--line)', padding: '12px 16px', display: 'flex', gap: 8 },

  groupLabel: {
    display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
  },
  input: {
    width: '100%', height: 48, padding: '0 14px',
    border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-2)',
    fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  },

  btnPrimary: {
    flex: 2, height: 48, borderRadius: 12, border: 0,
    background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    flex: 1, height: 48, borderRadius: 12, border: '1px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
};
