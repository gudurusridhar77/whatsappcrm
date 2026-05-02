import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { chatbotFlowsApi, ChatbotFlowResponse } from '../../api/chatbotFlows';

const triggerLabels: Record<string, string> = {
  WELCOME: 'First message (Welcome)',
  KEYWORD: 'Keyword match',
  CONVERSATION_CREATED: 'Conversation created',
};

const ChatbotFlowsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<ChatbotFlowResponse[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFlows = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await chatbotFlowsApi.getFlows(currentAccountId);
      setFlows(res.data);
    } catch {
      setError('Failed to load chatbot flows');
    }
  }, [currentAccountId]);

  useEffect(() => { loadFlows(); }, [loadFlows]);

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
          <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: '14px' }}>
            Build automated conversation flows to handle FAQs, route customers, and reduce agent workload
          </p>
        </div>
        <button onClick={() => navigate('/chatbot/new')} style={styles.primaryBtn}>+ New Flow</button>
      </div>

      {error && <div style={styles.errorBanner}>{error}<button onClick={() => setError('')} style={styles.closeBtn}>&times;</button></div>}
      {success && <div style={styles.successBanner}>{success}<button onClick={() => setSuccess('')} style={styles.closeBtn}>&times;</button></div>}

      {/* Flows Grid */}
      <div style={styles.flowGrid}>
        {flows.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤖</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>No chatbot flows yet</h3>
            <p style={{ color: 'var(--ink-3)', fontSize: '14px', margin: '0 0 16px' }}>
              Create your first automated conversation flow to handle customer inquiries 24/7
            </p>
            <button onClick={() => navigate('/chatbot/new')} style={styles.primaryBtn}>Create Your First Flow</button>
          </div>
        ) : flows.map(flow => (
          <div key={flow.id} style={styles.flowCard}>
            <div style={styles.flowCardHeader}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>{flow.name}</h3>
                {flow.description && <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-3)' }}>{flow.description}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                  backgroundColor: flow.active ? '#d1fae5' : 'var(--surface-3)',
                  color: flow.active ? 'var(--ok)' : 'var(--ink-4)',
                }}>{flow.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div style={styles.flowCardBody}>
              <div style={styles.flowMeta}>
                <span>🎯 {triggerLabels[flow.triggerType] || flow.triggerType}</span>
                {flow.triggerKeywords && <span style={{ color: 'var(--ink-3)' }}>Keywords: {flow.triggerKeywords}</span>}
              </div>
              <div style={styles.flowMeta}>
                <span>📦 {flow.nodeCount} nodes</span>
                {flow.inboxName && <span>📥 {flow.inboxName}</span>}
                <span>Priority: {flow.priority}</span>
              </div>
            </div>
            <div style={styles.flowCardFooter}>
              <button onClick={() => navigate(`/chatbot/builder/${flow.id}`)}
                style={{ ...styles.actionBtn, color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                ✏️ Edit Flow
              </button>
              <button onClick={() => handleToggle(flow.id)}
                style={{ ...styles.actionBtn, color: flow.active ? 'var(--warn)' : 'var(--ok)' }}>
                {flow.active ? '⏸ Disable' : '▶ Enable'}
              </button>
              <button onClick={() => handleDuplicate(flow.id)} style={styles.actionBtn}>
                📋 Duplicate
              </button>
              <button onClick={() => handleDelete(flow.id)} style={{ ...styles.actionBtn, color: 'var(--danger)' }}>
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
  container: { backgroundColor: 'var(--surface)', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { margin: 0, fontSize: '18px', color: 'var(--ink)' },
  primaryBtn: { padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'var(--surface)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  errorBanner: { backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' },
  successBanner: { backgroundColor: '#f0fdf4', color: 'var(--ok)', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--ink-3)' },
  flowGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' },
  flowCard: { border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' },
  flowCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 16px 8px' },
  flowCardBody: { padding: '0 16px 12px' },
  flowMeta: { display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--ink-3)', marginTop: '6px' },
  flowCardFooter: { display: 'flex', gap: '6px', padding: '12px 16px', borderTop: '1px solid #f0f0f0', backgroundColor: 'var(--surface-2)' },
  actionBtn: { padding: '4px 10px', backgroundColor: 'transparent', border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: 'var(--ink)' },
  emptyState: { gridColumn: '1 / -1', textAlign: 'center' as const, padding: '60px 20px' },
};

export default ChatbotFlowsPage;
