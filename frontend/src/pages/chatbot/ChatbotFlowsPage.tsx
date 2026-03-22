import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { chatbotFlowsApi, ChatbotFlowResponse, ChatbotFlowRequest } from '../../api/chatbotFlows';
import { inboxesApi, Inbox } from '../../api/inboxes';

const triggerLabels: Record<string, string> = {
  WELCOME: 'First message (Welcome)',
  KEYWORD: 'Keyword match',
  CONVERSATION_CREATED: 'Conversation created',
};

const ChatbotFlowsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<ChatbotFlowResponse[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('WELCOME');
  const [triggerKeywords, setTriggerKeywords] = useState('');
  const [inboxId, setInboxId] = useState<number | undefined>(undefined);

  const loadFlows = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await chatbotFlowsApi.getFlows(currentAccountId);
      setFlows(res.data);
    } catch {
      setError('Failed to load chatbot flows');
    }
  }, [currentAccountId]);

  const loadInboxes = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await inboxesApi.getInboxes(currentAccountId);
      setInboxes(res.data);
    } catch { /* ignore */ }
  }, [currentAccountId]);

  useEffect(() => { loadFlows(); loadInboxes(); }, [loadFlows, loadInboxes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    setError('');
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
      setSuccess('Flow created! Opening builder...');
      resetForm();
      loadFlows();
      setTimeout(() => navigate(`/chatbot/builder/${res.data.id}`), 500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create flow');
    }
  };

  const resetForm = () => {
    setName(''); setDescription(''); setTriggerType('WELCOME');
    setTriggerKeywords(''); setInboxId(undefined); setShowCreate(false);
  };

  const handleToggle = async (id: number) => {
    if (!currentAccountId) return;
    try {
      await chatbotFlowsApi.toggleFlow(currentAccountId, id);
      loadFlows();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle flow');
    }
  };

  const handleDuplicate = async (id: number) => {
    if (!currentAccountId) return;
    try {
      await chatbotFlowsApi.duplicateFlow(currentAccountId, id);
      setSuccess('Flow duplicated!');
      loadFlows();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to duplicate flow');
    }
  };

  const handleDelete = async (id: number) => {
    if (!currentAccountId || !window.confirm('Delete this chatbot flow permanently?')) return;
    try {
      await chatbotFlowsApi.deleteFlow(currentAccountId, id);
      loadFlows();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete flow');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Chatbot Flows</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            Build automated conversation flows to handle FAQs, route customers, and reduce agent workload
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={styles.primaryBtn}>+ New Flow</button>
      </div>

      {error && <div style={styles.errorBanner}>{error}<button onClick={() => setError('')} style={styles.closeBtn}>&times;</button></div>}
      {success && <div style={styles.successBanner}>{success}<button onClick={() => setSuccess('')} style={styles.closeBtn}>&times;</button></div>}

      {/* Create Flow Modal */}
      {showCreate && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 16px 0' }}>Create New Chatbot Flow</h3>
            <form onSubmit={handleCreate}>
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
              <div style={styles.formGrid}>
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
                  <select value={inboxId || ''} onChange={e => setInboxId(e.target.value ? Number(e.target.value) : undefined)} style={styles.input}>
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
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
                A starter template with Welcome → Menu → Agent Handoff will be created. You can customize it in the visual builder.
              </p>
              <div style={styles.formActions}>
                <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.primaryBtn}>Create & Open Builder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flows Grid */}
      <div style={styles.flowGrid}>
        {flows.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤖</div>
            <h3 style={{ margin: '0 0 8px', color: '#333' }}>No chatbot flows yet</h3>
            <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px' }}>
              Create your first automated conversation flow to handle customer inquiries 24/7
            </p>
            <button onClick={() => setShowCreate(true)} style={styles.primaryBtn}>Create Your First Flow</button>
          </div>
        ) : flows.map(flow => (
          <div key={flow.id} style={styles.flowCard}>
            <div style={styles.flowCardHeader}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>{flow.name}</h3>
                {flow.description && <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>{flow.description}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                  backgroundColor: flow.active ? '#d1fae5' : '#f3f4f6',
                  color: flow.active ? '#059669' : '#9ca3af',
                }}>{flow.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div style={styles.flowCardBody}>
              <div style={styles.flowMeta}>
                <span>🎯 {triggerLabels[flow.triggerType] || flow.triggerType}</span>
                {flow.triggerKeywords && <span style={{ color: '#888' }}>Keywords: {flow.triggerKeywords}</span>}
              </div>
              <div style={styles.flowMeta}>
                <span>📦 {flow.nodeCount} nodes</span>
                {flow.inboxName && <span>📥 {flow.inboxName}</span>}
                <span>Priority: {flow.priority}</span>
              </div>
            </div>
            <div style={styles.flowCardFooter}>
              <button onClick={() => navigate(`/chatbot/builder/${flow.id}`)}
                style={{ ...styles.actionBtn, color: '#1b72e8', borderColor: '#1b72e8' }}>
                ✏️ Edit Flow
              </button>
              <button onClick={() => handleToggle(flow.id)}
                style={{ ...styles.actionBtn, color: flow.active ? '#d97706' : '#059669' }}>
                {flow.active ? '⏸ Disable' : '▶ Enable'}
              </button>
              <button onClick={() => handleDuplicate(flow.id)} style={styles.actionBtn}>
                📋 Duplicate
              </button>
              <button onClick={() => handleDelete(flow.id)} style={{ ...styles.actionBtn, color: '#dc2626' }}>
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { margin: 0, fontSize: '18px', color: '#333' },
  primaryBtn: { padding: '8px 16px', backgroundColor: '#1b72e8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  errorBanner: { backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' },
  successBanner: { backgroundColor: '#f0fdf4', color: '#059669', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' as const },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  field: { marginBottom: '12px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500, color: '#555' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' },
  flowGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' },
  flowCard: { border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' },
  flowCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 16px 8px' },
  flowCardBody: { padding: '0 16px 12px' },
  flowMeta: { display: 'flex', gap: '12px', fontSize: '13px', color: '#666', marginTop: '6px' },
  flowCardFooter: { display: 'flex', gap: '6px', padding: '12px 16px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa' },
  actionBtn: { padding: '4px 10px', backgroundColor: 'transparent', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#333' },
  emptyState: { gridColumn: '1 / -1', textAlign: 'center' as const, padding: '60px 20px' },
};

export default ChatbotFlowsPage;
