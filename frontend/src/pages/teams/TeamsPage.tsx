import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { teamsApi, TeamResponse, agentsApi, AgentResponse } from '../../api/teams';

const TeamsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allowAutoAssign, setAllowAutoAssign] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Member management
  const [managingTeamId, setManagingTeamId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const [tRes, aRes] = await Promise.all([
        teamsApi.getTeams(currentAccountId),
        agentsApi.getAgents(currentAccountId),
      ]);
      setTeams(tRes.data);
      setAgents(aRes.data);
    } catch {
      setError('Failed to load data');
    }
  }, [currentAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAllowAutoAssign(true);
    setSelectedMembers([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (team: TeamResponse) => {
    setName(team.name);
    setDescription(team.description || '');
    setAllowAutoAssign(team.allowAutoAssign);
    setSelectedMembers(team.members.map(m => m.id));
    setEditingId(team.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId || !name.trim()) return;
    setError('');
    try {
      if (editingId) {
        await teamsApi.updateTeam(currentAccountId, editingId, {
          name: name.trim(),
          description: description.trim() || undefined,
          allowAutoAssign,
        });
        // Update members
        await teamsApi.setMembers(currentAccountId, editingId, selectedMembers);
        setSuccess('Team updated');
      } else {
        await teamsApi.createTeam(currentAccountId, {
          name: name.trim(),
          description: description.trim() || undefined,
          allowAutoAssign,
          memberIds: selectedMembers,
        });
        setSuccess('Team created');
      }
      resetForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save team');
    }
  };

  const handleDelete = async (teamId: number, teamName: string) => {
    if (!currentAccountId) return;
    if (!window.confirm(`Delete team "${teamName}"?`)) return;
    try {
      await teamsApi.deleteTeam(currentAccountId, teamId);
      setSuccess('Team deleted');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete team');
    }
  };

  const toggleMember = (agentId: number) => {
    setSelectedMembers(prev =>
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    );
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Teams</h2>
          <p style={styles.subtitle}>Organize agents into teams for better conversation routing and management.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={styles.addBtn}>+ New Team</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
            {editingId ? 'Edit Team' : 'Create Team'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Team Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  style={styles.input} placeholder="e.g. Sales, Support, Engineering" required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)}
                  style={styles.input} placeholder="What does this team handle?" />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={allowAutoAssign}
                  onChange={(e) => setAllowAutoAssign(e.target.checked)} />
                Allow auto-assignment (round-robin to team members)
              </label>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Team Members</label>
              <div style={styles.memberGrid}>
                {agents.map(agent => (
                  <div key={agent.id}
                    onClick={() => toggleMember(agent.id)}
                    style={{
                      ...styles.memberCard,
                      ...(selectedMembers.includes(agent.id) ? styles.memberCardActive : {}),
                    }}>
                    <div style={styles.memberAvatar}>
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.memberInfo}>
                      <div style={styles.memberName}>{agent.name}</div>
                      <div style={styles.memberEmail}>{agent.email}</div>
                    </div>
                    {selectedMembers.includes(agent.id) && (
                      <span style={styles.checkMark}>&#10003;</span>
                    )}
                  </div>
                ))}
                {agents.length === 0 && (
                  <div style={{ color: 'var(--ink-4)', fontSize: '13px' }}>No agents in this account yet.</div>
                )}
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
              <button type="submit" style={styles.primaryBtn}>
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teams Grid */}
      <div style={styles.grid}>
        {teams.length === 0 ? (
          <div style={styles.empty}>No teams yet. Create teams to organize your agents.</div>
        ) : (
          teams.map(team => (
            <div key={team.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardName}>{team.name}</h3>
                  {team.description && <p style={styles.cardDesc}>{team.description}</p>}
                </div>
                <div style={styles.cardActions}>
                  <button onClick={() => handleEdit(team)} style={styles.iconBtn} title="Edit">&#9998;</button>
                  <button onClick={() => handleDelete(team.id, team.name)} style={styles.iconBtnDanger} title="Delete">&#10005;</button>
                </div>
              </div>

              <div style={styles.cardMeta}>
                <span style={styles.badge}>
                  {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                </span>
                {team.allowAutoAssign && (
                  <span style={styles.autoBadge}>Auto-assign</span>
                )}
              </div>

              {/* Members */}
              <div style={styles.membersRow}>
                {team.members.slice(0, 5).map(member => (
                  <div key={member.id} style={styles.miniAvatar} title={member.name}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {team.members.length > 5 && (
                  <span style={styles.moreMembers}>+{team.members.length - 5}</span>
                )}
                {team.members.length === 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--ink-4)' }}>No members</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { margin: '0 0 4px 0', fontSize: '22px', color: 'var(--ink)' },
  subtitle: { margin: 0, fontSize: '13px', color: 'var(--ink-3)' },
  addBtn: {
    padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' as const,
  },
  error: { backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  success: { backgroundColor: '#f0fdf4', color: 'var(--ok)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  formCard: { backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' },
  formRow: { display: 'flex', gap: '16px', marginBottom: '12px' },
  field: { flex: 1, marginBottom: '12px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500, color: '#555' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const },
  checkLabel: { fontSize: '14px', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  memberGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' },
  memberCard: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
    border: '1px solid var(--line)', borderRadius: '6px', cursor: 'pointer',
  },
  memberCardActive: { borderColor: 'var(--accent)', backgroundColor: '#eff6ff' },
  memberAvatar: {
    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent)',
    color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: 600, flexShrink: 0,
  },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: '13px', fontWeight: 500, color: 'var(--ink)' },
  memberEmail: { fontSize: '11px', color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  checkMark: { color: 'var(--accent)', fontWeight: 700, fontSize: '16px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' },
  primaryBtn: { padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'var(--surface)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  cancelBtn: { padding: '8px 16px', backgroundColor: 'var(--surface-3)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  empty: { padding: '40px', textAlign: 'center' as const, color: 'var(--ink-4)', fontSize: '14px', gridColumn: '1 / -1', backgroundColor: 'var(--surface)', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  card: { backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  cardName: { margin: 0, fontSize: '16px', color: 'var(--ink)' },
  cardDesc: { margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-3)' },
  cardActions: { display: 'flex', gap: '4px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--ink-3)', padding: '4px 6px' },
  iconBtnDanger: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--danger)', padding: '4px 6px' },
  cardMeta: { display: 'flex', gap: '8px', marginBottom: '12px' },
  badge: { fontSize: '12px', backgroundColor: 'var(--surface-3)', padding: '2px 8px', borderRadius: '4px', color: 'var(--ink-3)' },
  autoBadge: { fontSize: '11px', backgroundColor: '#ecfdf5', color: 'var(--ok)', padding: '2px 8px', borderRadius: '4px' },
  membersRow: { display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' as const },
  miniAvatar: {
    width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#6366f1',
    color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 600,
  },
  moreMembers: { fontSize: '12px', color: 'var(--ink-3)', marginLeft: '4px' },
};

export default TeamsPage;
