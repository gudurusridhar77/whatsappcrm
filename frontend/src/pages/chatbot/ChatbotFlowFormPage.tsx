import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { chatbotFlowsApi, ChatbotFlowRequest } from '../../api/chatbotFlows';
import { inboxesApi, Inbox } from '../../api/inboxes';

const ChatbotFlowFormPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('WELCOME');
  const [triggerKeywords, setTriggerKeywords] = useState('');
  const [inboxId, setInboxId] = useState<number | undefined>(undefined);

  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadInboxes = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await inboxesApi.getInboxes(currentAccountId);
      setInboxes(res.data);
    } catch { /* ignore */ }
  }, [currentAccountId]);

  useEffect(() => { loadInboxes(); }, [loadInboxes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    setError(''); setLoading(true);
    try {
      const req: ChatbotFlowRequest = {
        name, description: description || undefined,
        triggerType,
        triggerKeywords: triggerType === 'KEYWORD' ? triggerKeywords : undefined,
        inboxId,
        flowData: {
          nodes: [
            { id: 'start_1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
            { id: 'msg_1', type: 'send_message', position: { x: 250, y: 180 }, data: { label: 'Welcome Message', message: 'Hello! Welcome to our support. How can I help you today?' } },
            { id: 'menu_1', type: 'menu', position: { x: 250, y: 340 }, data: { label: 'Main Menu', message: 'Please choose an option:', options: [{ label: 'Sales', value: 'sales', handle: 'option_0' }, { label: 'Support', value: 'support', handle: 'option_1' }, { label: 'FAQ', value: 'faq', handle: 'option_2' }] } },
            { id: 'agent_1', type: 'assign_agent', position: { x: 50, y: 520 }, data: { label: 'Connect to Sales', message: 'Connecting you to our sales team...' } },
            { id: 'agent_2', type: 'assign_agent', position: { x: 250, y: 520 }, data: { label: 'Connect to Support', message: 'Connecting you to a support agent...' } },
            { id: 'msg_2', type: 'send_message', position: { x: 450, y: 520 }, data: { label: 'FAQ Response', message: 'Here are our most common questions:\n1. What are your hours? Mon-Fri 9-5\n2. How do I reset my password? Visit /reset\n3. What is your return policy? 30 days' } },
            { id: 'end_1', type: 'end', position: { x: 450, y: 680 }, data: { label: 'End', message: 'Thank you! Is there anything else I can help with?' } },
          ],
          edges: [
            { id: 'e1', source: 'start_1', target: 'msg_1' },
            { id: 'e2', source: 'msg_1', target: 'menu_1' },
            { id: 'e3', source: 'menu_1', target: 'agent_1', sourceHandle: 'option_0' },
            { id: 'e4', source: 'menu_1', target: 'agent_2', sourceHandle: 'option_1' },
            { id: 'e5', source: 'menu_1', target: 'msg_2', sourceHandle: 'option_2' },
            { id: 'e6', source: 'msg_2', target: 'end_1' },
          ],
        },
      };
      const res = await chatbotFlowsApi.createFlow(currentAccountId, req);
      navigate(`/chatbot/builder/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create flow');
      setLoading(false);
    }
  };

  return (
    <div className="app-page-form" style={styles.page}>
      <div style={styles.headerBar}>
        <button onClick={() => navigate('/chatbot')} style={styles.backLink}>← Back to Flows</button>
        <h2 style={styles.title}>Create New Chatbot Flow</h2>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Flow Details</h3>
          <div style={styles.field}>
            <label style={styles.label}>Flow Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              style={styles.input} required placeholder="e.g. Welcome Flow, Support Bot" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              style={{ ...styles.input, minHeight: '60px' }} placeholder="What does this flow do?" />
          </div>
        </section>

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Trigger</h3>
          <div className="app-form-grid" style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Trigger *</label>
              <select value={triggerType} onChange={e => setTriggerType(e.target.value)} style={styles.input}>
                <option value="WELCOME">First message (Welcome)</option>
                <option value="KEYWORD">Keyword match</option>
                <option value="CONVERSATION_CREATED">Conversation created</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Inbox (optional)</label>
              <select value={inboxId || ''}
                onChange={e => setInboxId(e.target.value ? Number(e.target.value) : undefined)}
                style={styles.input}>
                <option value="">All inboxes</option>
                {inboxes.map(i => <option key={i.id} value={i.id}>{i.name} ({i.channelType})</option>)}
              </select>
            </div>
          </div>
          {triggerType === 'KEYWORD' && (
            <div style={styles.field}>
              <label style={styles.label}>Keywords (comma-separated)</label>
              <input type="text" value={triggerKeywords} onChange={e => setTriggerKeywords(e.target.value)}
                style={styles.input} placeholder="e.g. help, support, pricing" required />
            </div>
          )}
          <p style={styles.hint}>
            A starter template with Welcome → Menu → Agent Handoff will be created.
            You can customize it in the visual builder.
          </p>
        </section>

        <div className="app-form-actions" style={styles.actions}>
          <button type="button" onClick={() => navigate('/chatbot')} style={styles.cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading || !name}
            style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Create & Open Builder'}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '720px', margin: '0 auto', paddingBottom: '24px' },
  headerBar: { marginBottom: '16px' },
  backLink: {
    background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
    color: '#1b72e8', fontSize: '13px', fontWeight: 500,
  },
  title: { margin: '6px 0 0', fontSize: '20px', color: '#222' },
  errorBanner: {
    backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px 16px',
    borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    backgroundColor: '#fff', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '20px',
  },
  sectionTitle: { margin: '0 0 14px', fontSize: '15px', fontWeight: 600, color: '#333' },
  grid: {
    display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px',
  },
  field: { marginBottom: '12px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500, color: '#555' },
  input: {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
  },
  hint: { fontSize: '12px', color: '#888', margin: '8px 0 0' },
  actions: {
    position: 'sticky', bottom: 0, zIndex: 10,
    display: 'flex', justifyContent: 'flex-end', gap: '8px',
    padding: '12px 16px', backgroundColor: '#fff',
    borderTop: '1px solid #e5e7eb', borderRadius: '0 0 8px 8px',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.04)', marginTop: '8px',
  },
  primaryBtn: {
    padding: '10px 18px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
  },
  cancelBtn: {
    padding: '10px 18px', backgroundColor: '#f3f4f6', color: '#333',
    border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
};

export default ChatbotFlowFormPage;
