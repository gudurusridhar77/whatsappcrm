import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { broadcastsApi, BroadcastRequest, BroadcastResponse } from '../../api/broadcasts';
import { inboxesApi, Inbox } from '../../api/inboxes';
import { whatsappTemplatesApi, WhatsAppTemplate } from '../../api/whatsappTemplates';
import { contactsApi, Contact } from '../../api/contacts';

const BroadcastsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [broadcasts, setBroadcasts] = useState<BroadcastResponse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastResponse | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inboxId, setInboxId] = useState<number>(0);
  const [templateId, setTemplateId] = useState<number>(0);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [bodyParams, setBodyParams] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');

  // Lookups
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  const loadBroadcasts = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await broadcastsApi.getBroadcasts(currentAccountId);
      setBroadcasts(res.data);
    } catch {
      setError('Failed to load broadcasts');
    }
  }, [currentAccountId]);

  const loadInboxes = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await inboxesApi.getInboxes(currentAccountId);
      setInboxes(res.data.filter((i: Inbox) => i.channelType === 'WHATSAPP'));
    } catch { /* ignore */ }
  }, [currentAccountId]);

  const loadTemplates = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await whatsappTemplatesApi.getTemplates(currentAccountId);
      setTemplates(res.data.filter((t: WhatsAppTemplate) => t.status === 'APPROVED'));
    } catch { /* ignore */ }
  }, [currentAccountId]);

  const loadContacts = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await contactsApi.getContacts(currentAccountId, 0, 200, contactSearch);
      setContacts(res.data.content.filter((c: Contact) => c.phoneNumber));
    } catch { /* ignore */ }
  }, [currentAccountId, contactSearch]);

  useEffect(() => { loadBroadcasts(); }, [loadBroadcasts]);

  useEffect(() => {
    if (showForm) {
      loadInboxes();
      loadTemplates();
      loadContacts();
    }
  }, [showForm, loadInboxes, loadTemplates, loadContacts]);

  const selectedTemplate = templates.find(t => t.id === templateId);

  useEffect(() => {
    if (selectedTemplate) {
      setBodyParams(Array(selectedTemplate.bodyParamCount).fill(''));
    } else {
      setBodyParams([]);
    }
  }, [templateId, selectedTemplate]);

  const resetForm = () => {
    setName(''); setDescription(''); setInboxId(0); setTemplateId(0);
    setSendToAll(true); setSelectedContactIds([]); setBodyParams([]);
    setScheduledAt(''); setShowForm(false); setContactSearch('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    setError(''); setLoading(true);
    try {
      const req: BroadcastRequest = {
        name, description: description || undefined,
        inboxId, templateId,
        contactIds: sendToAll ? undefined : selectedContactIds,
        defaultBodyParams: bodyParams.length > 0 ? bodyParams : undefined,
        scheduledAt: scheduledAt || undefined,
      };
      await broadcastsApi.createBroadcast(currentAccountId, req);
      setSuccess('Broadcast created successfully!');
      resetForm();
      loadBroadcasts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create broadcast');
    } finally { setLoading(false); }
  };

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

  const toggleContact = (id: number) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#4b5563' },
      SCHEDULED: { bg: '#dbeafe', text: '#1d4ed8' },
      PROCESSING: { bg: '#fef3c7', text: '#d97706' },
      COMPLETED: { bg: '#d1fae5', text: '#059669' },
      FAILED: { bg: '#fee2e2', text: '#dc2626' },
      CANCELLED: { bg: '#f3f4f6', text: '#9ca3af' },
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

  const progressBar = (b: BroadcastResponse) => {
    if (!b.totalCount) return null;
    const sentPct = (b.sentCount / b.totalCount) * 100;
    const deliveredPct = (b.deliveredCount / b.totalCount) * 100;
    const readPct = (b.readCount / b.totalCount) * 100;
    const failedPct = (b.failedCount / b.totalCount) * 100;
    return (
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f3f4f6', marginTop: '8px' }}>
        <div style={{ width: `${readPct}%`, backgroundColor: '#059669' }} title={`Read: ${b.readCount}`} />
        <div style={{ width: `${deliveredPct}%`, backgroundColor: '#3b82f6' }} title={`Delivered: ${b.deliveredCount}`} />
        <div style={{ width: `${Math.max(0, sentPct - deliveredPct - readPct)}%`, backgroundColor: '#93c5fd' }} title={`Sent: ${b.sentCount}`} />
        <div style={{ width: `${failedPct}%`, backgroundColor: '#ef4444' }} title={`Failed: ${b.failedCount}`} />
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Broadcasts</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            Send bulk WhatsApp messages using approved templates
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.primaryBtn}>+ New Broadcast</button>
      </div>

      {error && <div style={styles.errorBanner}>{error}<button onClick={() => setError('')} style={styles.closeBtnSmall}>&times;</button></div>}
      {success && <div style={styles.successBanner}>{success}<button onClick={() => setSuccess('')} style={styles.closeBtnSmall}>&times;</button></div>}

      {/* Create Broadcast Form */}
      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Create Broadcast</h3>
              <button onClick={resetForm} style={styles.closeBtnSmall}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    style={styles.input} required placeholder="e.g. March Promotion" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>WhatsApp Inbox *</label>
                  <select value={inboxId} onChange={e => setInboxId(Number(e.target.value))}
                    style={styles.input} required>
                    <option value={0}>Select inbox...</option>
                    {inboxes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Template *</label>
                  <select value={templateId} onChange={e => setTemplateId(Number(e.target.value))}
                    style={styles.input} required>
                    <option value={0}>Select template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.language})</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Schedule (optional)</label>
                  <input type="datetime-local" value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)} style={styles.input} />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  style={{ ...styles.input, minHeight: '60px' }} placeholder="Optional description" />
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Template Preview</div>
                  <div style={{ fontSize: '13px', color: '#333', whiteSpace: 'pre-wrap' }}>{selectedTemplate.body}</div>
                </div>
              )}

              {/* Body Params */}
              {bodyParams.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={styles.label}>Template Parameters</label>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '2px', marginBottom: '8px' }}>
                    Use placeholders: {'{{name}}, {{phone}}, {{email}}, {{company}}'} for contact-specific values
                  </p>
                  {bodyParams.map((p, i) => (
                    <div key={i} style={{ marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', color: '#888' }}>{`{{${i + 1}}}`}</label>
                      <input type="text" value={p}
                        onChange={e => {
                          const newParams = [...bodyParams];
                          newParams[i] = e.target.value;
                          setBodyParams(newParams);
                        }}
                        style={styles.input} placeholder={`Parameter ${i + 1} value or {{name}}`} />
                    </div>
                  ))}
                </div>
              )}

              {/* Recipients */}
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Recipients</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="radio" checked={sendToAll} onChange={() => setSendToAll(true)} />
                    All contacts with phone numbers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="radio" checked={!sendToAll} onChange={() => setSendToAll(false)} />
                    Select specific contacts
                  </label>
                </div>
              </div>

              {/* Contact Picker */}
              {!sendToAll && (
                <div style={{ marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
                  <input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                    placeholder="Search contacts..." style={{ ...styles.input, marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    {selectedContactIds.length} contacts selected
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {contacts.map(c => (
                      <label key={c.id} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px',
                        cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '13px',
                      }}>
                        <input type="checkbox" checked={selectedContactIds.includes(c.id)}
                          onChange={() => toggleContact(c.id)} />
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                        <span style={{ color: '#888' }}>{c.phoneNumber}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.formActions}>
                <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={loading || !inboxId || !templateId}
                  style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Creating...' : 'Create Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Detail Panel */}
      {selectedBroadcast && (
        <div style={styles.detailPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedBroadcast.name}</h3>
            <button onClick={() => setSelectedBroadcast(null)} style={styles.closeBtnSmall}>&times;</button>
          </div>
          <div style={styles.statsGrid}>
            <StatCard label="Total" value={selectedBroadcast.totalCount} color="#6b7280" />
            <StatCard label="Sent" value={selectedBroadcast.sentCount} color="#3b82f6" />
            <StatCard label="Delivered" value={selectedBroadcast.deliveredCount} color="#8b5cf6" />
            <StatCard label="Read" value={selectedBroadcast.readCount} color="#059669" />
            <StatCard label="Failed" value={selectedBroadcast.failedCount} color="#dc2626" />
            <StatCard label="Replied" value={selectedBroadcast.repliedCount} color="#f59e0b" />
          </div>
          {progressBar(selectedBroadcast)}
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#666' }}>
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
              <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#999', padding: '40px' }}>
                No broadcasts yet. Create your first broadcast to send bulk WhatsApp messages!
              </td>
            </tr>
          ) : (
            broadcasts.map(b => (
              <tr key={b.id} style={{ ...styles.tr, cursor: 'pointer', backgroundColor: selectedBroadcast?.id === b.id ? '#f8fafc' : undefined }}
                onClick={() => setSelectedBroadcast(b)}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 500 }}>{b.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{b.inboxName}</div>
                </td>
                <td style={styles.td}>
                  <span style={{ fontSize: '13px' }}>{b.templateName}</span>
                </td>
                <td style={styles.td}>{statusBadge(b.status)}</td>
                <td style={styles.td}>
                  <div style={{ fontSize: '13px' }}>
                    {b.sentCount}/{b.totalCount} sent
                    {b.deliveredCount > 0 && <span style={{ color: '#3b82f6' }}> · {b.deliveredCount} delivered</span>}
                    {b.readCount > 0 && <span style={{ color: '#059669' }}> · {b.readCount} read</span>}
                    {b.failedCount > 0 && <span style={{ color: '#dc2626' }}> · {b.failedCount} failed</span>}
                  </div>
                  {progressBar(b)}
                </td>
                <td style={styles.td}>{new Date(b.createdAt).toLocaleDateString()}</td>
                <td style={styles.td} onClick={e => e.stopPropagation()}>
                  {(b.status === 'DRAFT' || b.status === 'SCHEDULED') && (
                    <button onClick={() => handleStart(b.id)} style={{ ...styles.actionBtn, color: '#059669', borderColor: '#059669' }}>
                      ▶ Start
                    </button>
                  )}
                  {(b.status === 'DRAFT' || b.status === 'SCHEDULED' || b.status === 'PROCESSING') && (
                    <button onClick={() => handleCancel(b.id)} style={{ ...styles.actionBtn, color: '#f59e0b' }}>
                      Cancel
                    </button>
                  )}
                  <button onClick={() => handleDelete(b.id)} style={{ ...styles.actionBtn, color: '#dc2626' }}>
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
    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{label}</div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '20px',
  },
  title: { margin: 0, fontSize: '18px', color: '#333' },
  primaryBtn: {
    padding: '8px 16px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  cancelBtn: {
    padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#333',
    border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  errorBanner: {
    backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px 16px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  successBanner: {
    backgroundColor: '#f0fdf4', color: '#059669', padding: '12px 16px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  closeBtnSmall: {
    background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer',
    color: '#888', padding: '0 4px',
  },
  modalOverlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '8px', padding: '24px',
    width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' as const,
  },
  formGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
  },
  field: { marginBottom: '12px' },
  label: {
    display: 'block', marginBottom: '4px', fontSize: '13px',
    fontWeight: 500, color: '#555',
  },
  input: {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const,
  },
  formActions: {
    display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px',
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
    textAlign: 'left' as const, padding: '12px 8px', borderBottom: '2px solid #eee',
    fontSize: '13px', color: '#666', textTransform: 'uppercase' as const,
  },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 8px', fontSize: '14px' },
  actionBtn: {
    padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid #ddd',
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '4px',
    color: '#333',
  },
};

export default BroadcastsPage;
