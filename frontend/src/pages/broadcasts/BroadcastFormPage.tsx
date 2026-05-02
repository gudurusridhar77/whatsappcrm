import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { broadcastsApi, BroadcastRequest } from '../../api/broadcasts';
import { inboxesApi, Inbox } from '../../api/inboxes';
import { whatsappTemplatesApi, WhatsAppTemplate } from '../../api/whatsappTemplates';
import { contactsApi, Contact } from '../../api/contacts';

const BroadcastFormPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inboxId, setInboxId] = useState<number>(0);
  const [templateId, setTemplateId] = useState<number>(0);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [bodyParams, setBodyParams] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');

  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => { loadInboxes(); loadTemplates(); }, [loadInboxes, loadTemplates]);
  useEffect(() => { loadContacts(); }, [loadContacts]);

  const selectedTemplate = templates.find(t => t.id === templateId);

  useEffect(() => {
    setBodyParams(selectedTemplate ? Array(selectedTemplate.bodyParamCount).fill('') : []);
  }, [templateId, selectedTemplate]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      navigate('/broadcasts', { state: { created: true } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create broadcast');
      setLoading(false);
    }
  };

  const toggleContact = (id: number) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="app-page-form" style={styles.page}>
      <div style={styles.headerBar}>
        <button onClick={() => navigate('/broadcasts')} style={styles.backLink}>
          ← Back to Broadcasts
        </button>
        <h2 style={styles.title}>Create Broadcast</h2>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Section: Basics */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Basics</h3>
          <div className="app-form-grid" style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                style={styles.input} required placeholder="e.g. March Promotion" />
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
        </section>

        {/* Section: Channel & Template */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Channel & Template</h3>
          <div className="app-form-grid" style={styles.grid}>
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
          </div>

          {selectedTemplate && (
            <div style={styles.preview}>
              <div style={styles.previewLabel}>Template Preview</div>
              <div style={styles.previewBody}>{selectedTemplate.body}</div>
            </div>
          )}

          {bodyParams.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <label style={styles.label}>Template Parameters</label>
              <p style={styles.hint}>
                Use placeholders: {'{{name}}, {{phone}}, {{email}}, {{company}}'} for contact-specific values
              </p>
              {bodyParams.map((p, i) => (
                <div key={i} style={{ marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{`{{${i + 1}}}`}</label>
                  <input type="text" value={p}
                    onChange={e => {
                      const next = [...bodyParams];
                      next[i] = e.target.value;
                      setBodyParams(next);
                    }}
                    style={styles.input} placeholder={`Parameter ${i + 1} value or {{name}}`} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Recipients */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Recipients</h3>
          <div style={styles.radioRow}>
            <label style={styles.radioLabel}>
              <input type="radio" checked={sendToAll} onChange={() => setSendToAll(true)} />
              All contacts with phone numbers
            </label>
            <label style={styles.radioLabel}>
              <input type="radio" checked={!sendToAll} onChange={() => setSendToAll(false)} />
              Select specific contacts
            </label>
          </div>

          {!sendToAll && (
            <div style={styles.contactPicker}>
              <input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                placeholder="Search contacts..." style={{ ...styles.input, marginBottom: '8px' }} />
              <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '8px' }}>
                {selectedContactIds.length} contacts selected
              </div>
              <div style={styles.contactList}>
                {contacts.map(c => (
                  <label key={c.id} style={styles.contactItem}>
                    <input type="checkbox" checked={selectedContactIds.includes(c.id)}
                      onChange={() => toggleContact(c.id)} />
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    <span style={{ color: 'var(--ink-3)' }}>{c.phoneNumber}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Sticky action bar */}
        <div className="app-form-actions" style={styles.actions}>
          <button type="button" onClick={() => navigate('/broadcasts')} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" disabled={loading || !inboxId || !templateId || !name}
            style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Create Broadcast'}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '720px',
    margin: '0 auto',
    paddingBottom: '24px',
  },
  headerBar: { marginBottom: '16px' },
  backLink: {
    background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
    color: 'var(--accent)', fontSize: '13px', fontWeight: 500,
  },
  title: { margin: '6px 0 0', fontSize: '20px', color: 'var(--ink)' },
  errorBanner: {
    backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '12px 16px',
    borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    backgroundColor: 'var(--surface)', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '20px',
  },
  sectionTitle: {
    margin: '0 0 14px', fontSize: '15px', fontWeight: 600, color: 'var(--ink)',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px',
  },
  field: { marginBottom: '12px' },
  label: {
    display: 'block', marginBottom: '4px', fontSize: '13px',
    fontWeight: 500, color: '#555',
  },
  input: {
    width: '100%', padding: '8px 12px', border: '1px solid var(--line)',
    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
  },
  hint: { fontSize: '12px', color: 'var(--ink-3)', margin: '2px 0 8px' },
  preview: {
    backgroundColor: '#f0fdf4', border: '1px solid #86efac',
    borderRadius: '6px', padding: '12px', marginTop: '12px',
  },
  previewLabel: {
    fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px',
  },
  previewBody: { fontSize: '13px', color: 'var(--ink)', whiteSpace: 'pre-wrap' },
  radioRow: { display: 'flex', flexWrap: 'wrap', gap: '16px' },
  radioLabel: {
    display: 'flex', alignItems: 'center', gap: '6px',
    cursor: 'pointer', fontSize: '14px',
  },
  contactPicker: {
    border: '1px solid var(--line)', borderRadius: '6px',
    padding: '12px', marginTop: '12px',
  },
  contactList: { maxHeight: '240px', overflowY: 'auto' },
  contactItem: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px',
    cursor: 'pointer', borderBottom: '1px solid var(--surface-3)', fontSize: '13px',
  },
  actions: {
    position: 'sticky', bottom: 0, zIndex: 10,
    display: 'flex', justifyContent: 'flex-end', gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'var(--surface)',
    borderTop: '1px solid var(--line)',
    borderRadius: '0 0 8px 8px',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
    marginTop: '8px',
  },
  primaryBtn: {
    padding: '10px 18px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
    fontWeight: 500,
  },
  cancelBtn: {
    padding: '10px 18px', backgroundColor: 'var(--surface-3)', color: 'var(--ink)',
    border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
};

export default BroadcastFormPage;
