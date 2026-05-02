import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cannedResponsesApi, CannedResponse } from '../../api/cannedResponses';

const CannedResponsesPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [shortCode, setShortCode] = useState('');
  const [content, setContent] = useState('');

  const loadResponses = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await cannedResponsesApi.getAll(currentAccountId);
      setResponses(res.data);
    } catch {
      setError('Failed to load canned responses');
    }
  }, [currentAccountId]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  const resetForm = () => {
    setShortCode('');
    setContent('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (cr: CannedResponse) => {
    setShortCode(cr.shortCode);
    setContent(cr.content);
    setEditingId(cr.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId || !shortCode.trim() || !content.trim()) return;
    setError('');
    try {
      if (editingId) {
        await cannedResponsesApi.update(currentAccountId, editingId, {
          shortCode: shortCode.trim(),
          content: content.trim(),
        });
        setSuccess('Canned response updated');
      } else {
        await cannedResponsesApi.create(currentAccountId, {
          shortCode: shortCode.trim(),
          content: content.trim(),
        });
        setSuccess('Canned response created');
      }
      resetForm();
      loadResponses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save canned response');
    }
  };

  const handleDelete = async (id: number, code: string) => {
    if (!currentAccountId) return;
    if (!window.confirm(`Delete canned response "/${code}"?`)) return;
    try {
      await cannedResponsesApi.delete(currentAccountId, id);
      setSuccess('Canned response deleted');
      loadResponses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Canned Responses</h2>
          <p style={styles.subtitle}>
            Pre-written templates you can quickly insert while chatting. Type <code>/</code> in the message box to search.
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={styles.addBtn}>
          + New Response
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
            {editingId ? 'Edit Canned Response' : 'Create Canned Response'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>
                Short Code * <span style={styles.hint}>(lowercase, no spaces — e.g. greeting, thanks, refund_policy)</span>
              </label>
              <div style={styles.codeInputWrap}>
                <span style={styles.codePrefix}>/</span>
                <input value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  style={styles.codeInput} placeholder="short_code" required />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>
                Message Content * <span style={styles.hint}>(supports variables: {`{{contact_name}}`}, {`{{agent_name}}`})</span>
              </label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                style={styles.textarea} rows={4}
                placeholder="Hi {{contact_name}}, thank you for reaching out! How can I help you today?" required />
            </div>
            {content && (
              <div style={styles.preview}>
                <div style={styles.previewLabel}>Preview:</div>
                <div style={styles.previewContent}>{content}</div>
              </div>
            )}
            <div style={styles.formActions}>
              <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
              <button type="submit" style={styles.primaryBtn}>
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Responses List */}
      {responses.length === 0 ? (
        <div style={styles.empty}>
          No canned responses yet. Create some common replies to speed up your conversations.
        </div>
      ) : (
        <div style={styles.list}>
          {responses.map((cr) => (
            <div key={cr.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <code style={styles.code}>/{cr.shortCode}</code>
                <div style={styles.cardActions}>
                  <button onClick={() => handleEdit(cr)} style={styles.iconBtn} title="Edit">&#9998;</button>
                  <button onClick={() => handleDelete(cr.id, cr.shortCode)} style={styles.iconBtnDanger} title="Delete">&#10005;</button>
                </div>
              </div>
              <div style={styles.cardContent}>{cr.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '20px',
  },
  title: { margin: '0 0 4px 0', fontSize: '22px', color: 'var(--ink)' },
  subtitle: { margin: 0, fontSize: '13px', color: 'var(--ink-3)' },
  addBtn: {
    padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
    whiteSpace: 'nowrap' as const,
  },
  error: {
    backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '10px 14px',
    borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
  },
  success: {
    backgroundColor: '#f0fdf4', color: 'var(--ok)', padding: '10px 14px',
    borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
  },
  formCard: {
    backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px',
  },
  field: { marginBottom: '14px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500, color: '#555' },
  hint: { fontWeight: 400, color: 'var(--ink-4)', fontSize: '12px' },
  codeInputWrap: {
    display: 'flex', alignItems: 'center', border: '1px solid var(--line)',
    borderRadius: '4px', overflow: 'hidden',
  },
  codePrefix: {
    padding: '8px 10px', backgroundColor: 'var(--surface-3)', color: 'var(--ink-3)',
    fontFamily: 'monospace', fontSize: '15px', fontWeight: 600,
    borderRight: '1px solid var(--line)',
  },
  codeInput: {
    flex: 1, padding: '8px 12px', border: 'none', fontSize: '14px',
    fontFamily: 'monospace', outline: 'none',
  },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
    borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
    boxSizing: 'border-box' as const, resize: 'vertical' as const,
  },
  preview: {
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px',
    padding: '12px', marginBottom: '14px',
  },
  previewLabel: { fontSize: '11px', color: 'var(--ink-4)', marginBottom: '4px', textTransform: 'uppercase' as const },
  previewContent: { fontSize: '14px', color: 'var(--ink)', lineHeight: '1.5' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  primaryBtn: {
    padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  cancelBtn: {
    padding: '8px 16px', backgroundColor: 'var(--surface-3)', color: 'var(--ink)',
    border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  empty: {
    padding: '40px', textAlign: 'center' as const, color: 'var(--ink-4)', fontSize: '14px',
    backgroundColor: 'var(--surface)', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  list: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  card: {
    backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '8px',
  },
  code: {
    fontSize: '14px', fontWeight: 600, color: 'var(--accent)',
    backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px',
  },
  cardActions: { display: 'flex', gap: '4px' },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
    color: 'var(--ink-3)', padding: '4px 6px',
  },
  iconBtnDanger: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
    color: 'var(--danger)', padding: '4px 6px',
  },
  cardContent: { fontSize: '14px', color: '#555', lineHeight: '1.5' },
};

export default CannedResponsesPage;
