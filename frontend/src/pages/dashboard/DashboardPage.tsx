import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { accountApi } from '../../api/account';
import { AccountUser } from '../../types';

const availabilityColors: Record<string, string> = {
  ONLINE: 'var(--ok)',
  BUSY: 'var(--warn)',
  OFFLINE: 'var(--ink-4)',
};

const DashboardPage: React.FC = () => {
  const { user, currentAccountId } = useAuth();
  const [members, setMembers] = useState<AccountUser[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('AGENT');
  const [error, setError] = useState('');

  const currentAccount = user?.accounts.find(a => a.accountId === currentAccountId);
  const isAdmin = currentAccount?.role === 'ADMIN';

  useEffect(() => {
    if (currentAccountId) {
      loadMembers();
    }
  }, [currentAccountId]);

  const loadMembers = async () => {
    if (!currentAccountId) return;
    try {
      const response = await accountApi.getUsers(currentAccountId);
      setMembers(response.data);
    } catch {
      setError('Failed to load team members');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    try {
      await accountApi.inviteUser(currentAccountId, {
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      });
      setShowInvite(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('AGENT');
      loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to invite user');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!currentAccountId) return;
    try {
      await accountApi.updateRole(currentAccountId, userId, newRole);
      loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleRemove = async (userId: number) => {
    if (!currentAccountId || !window.confirm('Remove this user from the account?')) return;
    try {
      await accountApi.removeUser(currentAccountId, userId);
      loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove user');
    }
  };

  // Group by status
  const onlineMembers = members.filter(m => m.availability === 'ONLINE');
  const busyMembers = members.filter(m => m.availability === 'BUSY');
  const offlineMembers = members.filter(m => m.availability === 'OFFLINE');

  return (
    <div>
      {/* Availability Summary */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Online', count: onlineMembers.length, color: 'var(--ok)', bg: '#f0fdf4' },
          { label: 'Busy', count: busyMembers.length, color: 'var(--warn)', bg: '#fffbeb' },
          { label: 'Offline', count: offlineMembers.length, color: 'var(--ink-4)', bg: 'var(--surface-2)' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: '16px 20px', backgroundColor: s.bg,
            borderRadius: '8px', borderLeft: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-3)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Team Members */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Team Members</h2>
          {isAdmin && (
            <button onClick={() => setShowInvite(!showInvite)} style={styles.primaryBtn}>
              + Invite User
            </button>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {showInvite && (
          <form onSubmit={handleInvite} style={styles.inviteForm}>
            <input type="text" placeholder="Name" value={inviteName}
              onChange={(e) => setInviteName(e.target.value)} style={styles.input} required />
            <input type="email" placeholder="Email" value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)} style={styles.input} required />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={styles.input}>
              <option value="AGENT">Agent</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" style={styles.primaryBtn}>Send Invite</button>
          </form>
        )}

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Agent</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Invitation</th>
              {isAdmin && <th style={styles.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        backgroundColor: 'var(--line)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 600, color: '#555',
                      }}>
                        {(member.displayName || member.userName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{
                        position: 'absolute', bottom: '-1px', right: '-1px',
                        width: '10px', height: '10px', borderRadius: '50%',
                        backgroundColor: availabilityColors[member.availability] || 'var(--ink-4)',
                        border: '2px solid var(--surface)',
                      }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{member.userName}</div>
                      {member.displayName && member.displayName !== member.userName && (
                        <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{member.displayName}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={styles.td}>{member.email}</td>
                <td style={styles.td}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                    backgroundColor: member.availability === 'ONLINE' ? '#f0fdf4' :
                      member.availability === 'BUSY' ? '#fffbeb' : 'var(--surface-2)',
                    color: availabilityColors[member.availability] || 'var(--ink-4)',
                  }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      backgroundColor: availabilityColors[member.availability] || 'var(--ink-4)',
                    }} />
                    {member.availability || 'OFFLINE'}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.roleBadge,
                    backgroundColor: member.role === 'ADMIN' ? '#dbeafe' : 'var(--surface-3)',
                    color: member.role === 'ADMIN' ? '#1d4ed8' : 'var(--ink-2)',
                  }}>
                    {member.role}
                  </span>
                </td>
                <td style={styles.td}>{member.invitationStatus}</td>
                {isAdmin && (
                  <td style={styles.td}>
                    {member.userId !== user?.id && (
                      <>
                        <button
                          onClick={() => handleRoleChange(member.userId, member.role === 'ADMIN' ? 'AGENT' : 'ADMIN')}
                          style={styles.actionBtn}
                        >
                          Make {member.role === 'ADMIN' ? 'Agent' : 'Admin'}
                        </button>
                        <button onClick={() => handleRemove(member.userId)}
                          style={{ ...styles.actionBtn, color: 'var(--danger)' }}>
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: 'var(--surface)', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px',
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: { margin: 0, fontSize: '18px', color: 'var(--ink)' },
  primaryBtn: {
    padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  error: {
    backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '12px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
  },
  inviteForm: {
    display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const,
  },
  input: {
    padding: '8px 12px', border: '1px solid var(--line)', borderRadius: '4px',
    fontSize: '14px', flex: 1, minWidth: '150px',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    textAlign: 'left' as const, padding: '12px 8px', borderBottom: '2px solid var(--line)',
    fontSize: '13px', color: 'var(--ink-3)', textTransform: 'uppercase' as const,
  },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 8px', fontSize: '14px' },
  roleBadge: {
    padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
  },
  actionBtn: {
    padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid var(--line)',
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '4px',
    color: 'var(--ink)',
  },
};

export default DashboardPage;
