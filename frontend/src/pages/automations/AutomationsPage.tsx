import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { automationsApi, AutomationRuleResponse, RuleCondition, RuleAction } from '../../api/automations';

const EVENT_LABELS: Record<string, string> = {
  conversation_created: 'Conversation Created',
  conversation_updated: 'Conversation Updated',
  message_created: 'Message Created',
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  status: 'Status', inbox_id: 'Inbox ID', message_content: 'Message Content',
  contact_email: 'Contact Email', contact_name: 'Contact Name',
  team_id: 'Team ID', assignee_id: 'Assignee ID', channel_type: 'Channel Type',
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: 'Equals', not_equals: 'Not Equals', contains: 'Contains', not_contains: 'Does Not Contain',
};

const ACTION_LABELS: Record<string, string> = {
  assign_agent: 'Assign Agent (by ID)', assign_team: 'Assign Team (by ID)',
  add_label: 'Add Label (by name)', send_message: 'Send Auto Message',
  change_status: 'Change Status',
};

const AutomationsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [rules, setRules] = useState<AutomationRuleResponse[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRuleResponse | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventName, setEventName] = useState('conversation_created');
  const [conditions, setConditions] = useState<RuleCondition[]>([{ attribute: 'status', operator: 'equals', value: '' }]);
  const [actions, setActions] = useState<RuleAction[]>([{ type: 'assign_agent', value: '' }]);

  const loadRules = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await automationsApi.getRules(currentAccountId);
      setRules(res.data);
    } catch { setError('Failed to load automation rules'); }
  }, [currentAccountId]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const resetForm = () => {
    setName(''); setDescription(''); setEventName('conversation_created');
    setConditions([{ attribute: 'status', operator: 'equals', value: '' }]);
    setActions([{ type: 'assign_agent', value: '' }]);
    setEditingRule(null); setShowForm(false);
  };

  const openEdit = (rule: AutomationRuleResponse) => {
    setEditingRule(rule); setName(rule.name); setDescription(rule.description || '');
    setEventName(rule.eventName); setConditions([...rule.conditions]); setActions([...rule.actions]);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    setError('');
    const data = { name, description, eventName, conditions, actions };
    try {
      if (editingRule) {
        await automationsApi.updateRule(currentAccountId, editingRule.id, data);
      } else {
        await automationsApi.createRule(currentAccountId, data);
      }
      resetForm(); loadRules();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save rule');
    }
  };

  const handleDelete = async (id: number) => {
    if (!currentAccountId || !window.confirm('Delete this automation rule?')) return;
    try { await automationsApi.deleteRule(currentAccountId, id); loadRules(); }
    catch { setError('Failed to delete'); }
  };

  const handleToggle = async (id: number) => {
    if (!currentAccountId) return;
    try { await automationsApi.toggleRule(currentAccountId, id); loadRules(); }
    catch { setError('Failed to toggle'); }
  };

  const updateCondition = (index: number, field: keyof RuleCondition, value: string) => {
    const updated = [...conditions]; updated[index] = { ...updated[index], [field]: value }; setConditions(updated);
  };

  const updateAction = (index: number, field: keyof RuleAction, value: string) => {
    const updated = [...actions]; updated[index] = { ...updated[index], [field]: value }; setActions(updated);
  };

  return (
    <div>
      <div style={st.header}>
        <h2 style={st.title}>Automation Rules</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={st.primaryBtn}>+ New Rule</button>
      </div>

      {error && <div style={st.error}>{error}</div>}

      {/* Rules List */}
      {rules.length === 0 && !showForm ? (
        <div style={st.empty}>
          <p>No automation rules yet.</p>
          <p style={{ color: '#999', fontSize: '13px' }}>
            Create rules to auto-assign, auto-label, or auto-reply to conversations.
          </p>
        </div>
      ) : (
        <div style={st.rulesList}>
          {rules.map(rule => (
            <div key={rule.id} style={{ ...st.ruleCard, opacity: rule.active ? 1 : 0.6 }}>
              <div style={st.ruleHeader}>
                <div>
                  <span style={st.ruleName}>{rule.name}</span>
                  <span style={{ ...st.badge, backgroundColor: rule.active ? '#dcfce7' : '#fee2e2', color: rule.active ? '#166534' : '#991b1b' }}>
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={st.ruleActions}>
                  <button onClick={() => handleToggle(rule.id)} style={st.iconBtn}>
                    {rule.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => openEdit(rule)} style={st.iconBtn}>Edit</button>
                  <button onClick={() => handleDelete(rule.id)} style={{ ...st.iconBtn, color: '#dc2626' }}>Delete</button>
                </div>
              </div>
              {rule.description && <div style={st.ruleDesc}>{rule.description}</div>}
              <div style={st.ruleDetail}>
                <span style={st.detailLabel}>When:</span>
                <span style={st.eventBadge}>{EVENT_LABELS[rule.eventName] || rule.eventName}</span>
              </div>
              <div style={st.ruleDetail}>
                <span style={st.detailLabel}>If:</span>
                <div style={st.conditionsList}>
                  {rule.conditions.map((c, i) => (
                    <span key={i} style={st.condBadge}>
                      {ATTRIBUTE_LABELS[c.attribute] || c.attribute} {OPERATOR_LABELS[c.operator] || c.operator} "{c.value}"
                    </span>
                  ))}
                </div>
              </div>
              <div style={st.ruleDetail}>
                <span style={st.detailLabel}>Then:</span>
                <div style={st.conditionsList}>
                  {rule.actions.map((a, i) => (
                    <span key={i} style={st.actionBadge}>
                      {ACTION_LABELS[a.type] || a.type}: "{a.value}"
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="app-modal-overlay" style={st.modalOverlay}>
          <div className="app-modal" style={st.modal}>
            <h3 style={{ margin: '0 0 20px 0' }}>{editingRule ? 'Edit Rule' : 'New Automation Rule'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={st.field}>
                <label style={st.label}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} style={st.input} required placeholder="e.g. Auto-assign VIP customers" />
              </div>
              <div style={st.field}>
                <label style={st.label}>Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} style={st.input} placeholder="What does this rule do?" />
              </div>
              <div style={st.field}>
                <label style={st.label}>Trigger Event *</label>
                <select value={eventName} onChange={e => setEventName(e.target.value)} style={st.input}>
                  {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {/* Conditions */}
              <div style={st.section}>
                <div style={st.sectionHeader}>
                  <span style={st.sectionTitle}>Conditions (all must match)</span>
                  <button type="button" onClick={() => setConditions([...conditions, { attribute: 'status', operator: 'equals', value: '' }])} style={st.addBtn}>+ Add</button>
                </div>
                {conditions.map((cond, i) => (
                  <div key={i} style={st.condRow}>
                    <select value={cond.attribute} onChange={e => updateCondition(i, 'attribute', e.target.value)} style={st.condSelect}>
                      {Object.entries(ATTRIBUTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select value={cond.operator} onChange={e => updateCondition(i, 'operator', e.target.value)} style={st.condSelect}>
                      {Object.entries(OPERATOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)} style={st.condInput} placeholder="Value" required />
                    {conditions.length > 1 && (
                      <button type="button" onClick={() => setConditions(conditions.filter((_, j) => j !== i))} style={st.removeBtn}>×</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={st.section}>
                <div style={st.sectionHeader}>
                  <span style={st.sectionTitle}>Actions</span>
                  <button type="button" onClick={() => setActions([...actions, { type: 'assign_agent', value: '' }])} style={st.addBtn}>+ Add</button>
                </div>
                {actions.map((act, i) => (
                  <div key={i} style={st.condRow}>
                    <select value={act.type} onChange={e => updateAction(i, 'type', e.target.value)} style={st.condSelect}>
                      {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input value={act.value} onChange={e => updateAction(i, 'value', e.target.value)}
                      style={{ ...st.condInput, flex: 2 }}
                      placeholder={act.type === 'send_message' ? 'Auto-reply message...' : act.type === 'change_status' ? 'open/resolved/pending' : 'ID or name'}
                      required />
                    {actions.length > 1 && (
                      <button type="button" onClick={() => setActions(actions.filter((_, j) => j !== i))} style={st.removeBtn}>×</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="app-modal-actions" style={st.formActions}>
                <button type="button" onClick={resetForm} style={st.cancelBtn}>Cancel</button>
                <button type="submit" style={st.primaryBtn}>{editingRule ? 'Update' : 'Create'} Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const st: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '22px', color: '#333' },
  error: { backgroundColor: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#666', fontSize: '15px' },
  primaryBtn: { padding: '8px 16px', backgroundColor: '#1b72e8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },

  rulesList: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  ruleCard: { backgroundColor: '#fff', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  ruleHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  ruleName: { fontSize: '15px', fontWeight: 600, color: '#333', marginRight: '8px' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 },
  ruleDesc: { fontSize: '13px', color: '#666', marginBottom: '10px' },
  ruleActions: { display: 'flex', gap: '8px' },
  iconBtn: { background: 'none', border: 'none', color: '#1b72e8', cursor: 'pointer', fontSize: '12px', fontWeight: 500 },
  ruleDetail: { display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' },
  detailLabel: { fontSize: '12px', fontWeight: 600, color: '#555', minWidth: '40px', marginTop: '3px' },
  eventBadge: { backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: '4px', fontSize: '12px' },
  conditionsList: { display: 'flex', flexWrap: 'wrap' as const, gap: '4px' },
  condBadge: { backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', color: '#555' },
  actionBadge: { backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', color: '#92400e' },

  // Modal
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '640px', maxHeight: '80vh', overflowY: 'auto' as const },
  field: { marginBottom: '12px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500, color: '#555' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const },
  section: { backgroundColor: '#f9fafb', padding: '12px', borderRadius: '6px', marginBottom: '16px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  sectionTitle: { fontSize: '13px', fontWeight: 600, color: '#333' },
  addBtn: { background: 'none', border: 'none', color: '#1b72e8', cursor: 'pointer', fontSize: '12px', fontWeight: 500 },
  condRow: { display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' },
  condSelect: { padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', flex: 1 },
  condInput: { padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', flex: 1 },
  removeBtn: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '18px', padding: '0 4px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' },
};

export default AutomationsPage;
