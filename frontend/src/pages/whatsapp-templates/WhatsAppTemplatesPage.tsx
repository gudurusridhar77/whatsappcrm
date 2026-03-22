import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { whatsappTemplatesApi, WhatsAppTemplate, CreateTemplateRequest, TemplateButton } from '../../api/whatsappTemplates';
import { inboxesApi, Inbox } from '../../api/inboxes';

const statusColors: Record<string, { bg: string; color: string }> = {
  APPROVED: { bg: '#f0fdf4', color: '#15803d' },
  PENDING: { bg: '#fffbeb', color: '#92400e' },
  REJECTED: { bg: '#fef2f2', color: '#dc2626' },
  PAUSED: { bg: '#f5f3ff', color: '#7c3aed' },
  DISABLED: { bg: '#f9fafb', color: '#6b7280' },
  DELETED: { bg: '#f9fafb', color: '#9ca3af' },
};

const categoryLabels: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utility',
  AUTHENTICATION: 'Authentication',
};

const languageOptions = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt_BR', label: 'Portuguese (BR)' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh_CN', label: 'Chinese (CN)' },
  { value: 'id', label: 'Indonesian' },
];

const WhatsAppTemplatesPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [formInboxId, setFormInboxId] = useState<number | ''>('');
  const [formName, setFormName] = useState('');
  const [formLanguage, setFormLanguage] = useState('en_US');
  const [formCategory, setFormCategory] = useState('MARKETING');
  const [formBody, setFormBody] = useState('');
  const [formHeaderType, setFormHeaderType] = useState('NONE');
  const [formHeaderText, setFormHeaderText] = useState('');
  const [formFooterText, setFormFooterText] = useState('');
  const [formButtons, setFormButtons] = useState<TemplateButton[]>([]);

  const loadTemplates = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await whatsappTemplatesApi.getTemplates(
        currentAccountId,
        selectedInboxId ? selectedInboxId : undefined
      );
      setTemplates(res.data);
    } catch {
      setError('Failed to load templates');
    }
  }, [currentAccountId, selectedInboxId]);

  const loadInboxes = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await inboxesApi.getInboxes(currentAccountId);
      setInboxes(res.data.filter(i => i.channelType === 'WHATSAPP'));
    } catch { /* ignore */ }
  }, [currentAccountId]);

  useEffect(() => { loadInboxes(); }, [loadInboxes]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormInboxId('');
    setFormName('');
    setFormLanguage('en_US');
    setFormCategory('MARKETING');
    setFormBody('');
    setFormHeaderType('NONE');
    setFormHeaderText('');
    setFormFooterText('');
    setFormButtons([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId || !formInboxId) return;
    setError('');
    try {
      const data: CreateTemplateRequest = {
        inboxId: formInboxId as number,
        name: formName,
        language: formLanguage,
        category: formCategory,
        body: formBody,
        headerType: formHeaderType,
        headerText: formHeaderType === 'TEXT' ? formHeaderText : undefined,
        footerText: formFooterText || undefined,
        buttons: formButtons.length > 0 ? formButtons : undefined,
      };

      if (editingTemplate) {
        await whatsappTemplatesApi.updateTemplate(currentAccountId, editingTemplate.id, data);
        setSuccessMsg('Template updated');
      } else {
        await whatsappTemplatesApi.createTemplate(currentAccountId, data);
        setSuccessMsg('Template created and submitted to Meta for approval');
      }
      resetForm();
      loadTemplates();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!currentAccountId || !window.confirm('Delete this template? This will also delete it from Meta.')) return;
    try {
      await whatsappTemplatesApi.deleteTemplate(currentAccountId, id);
      setSelectedTemplate(null);
      loadTemplates();
      setSuccessMsg('Template deleted');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const handleSync = async (inboxId: number) => {
    if (!currentAccountId) return;
    setSyncing(true);
    setError('');
    try {
      const res = await whatsappTemplatesApi.syncTemplates(currentAccountId, inboxId);
      setSuccessMsg(`Synced ${res.data.length} templates from Meta`);
      loadTemplates();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync templates');
    } finally {
      setSyncing(false);
    }
  };

  const handleEdit = (t: WhatsAppTemplate) => {
    setEditingTemplate(t);
    setFormInboxId(t.inboxId);
    setFormName(t.name);
    setFormLanguage(t.language);
    setFormCategory(t.category);
    setFormBody(t.body || '');
    setFormHeaderType(t.headerType || 'NONE');
    setFormHeaderText(t.headerText || '');
    setFormFooterText(t.footerText || '');
    try {
      setFormButtons(t.buttonsJson ? JSON.parse(t.buttonsJson) : []);
    } catch { setFormButtons([]); }
    setShowForm(true);
  };

  const addButton = () => {
    if (formButtons.length >= 3) return;
    setFormButtons([...formButtons, { type: 'QUICK_REPLY', text: '' }]);
  };

  const updateButton = (index: number, field: string, value: string) => {
    const updated = [...formButtons];
    (updated[index] as any)[field] = value;
    setFormButtons(updated);
  };

  const removeButton = (index: number) => {
    setFormButtons(formButtons.filter((_, i) => i !== index));
  };

  // Count {{n}} params in text
  const countParams = (text: string) => {
    const matches = text.match(/\{\{\d+\}\}/g);
    return matches ? new Set(matches).size : 0;
  };

  const renderPreview = () => {
    const body = showForm ? formBody : (selectedTemplate?.body || '');
    const headerType = showForm ? formHeaderType : (selectedTemplate?.headerType || 'NONE');
    const headerText = showForm ? formHeaderText : (selectedTemplate?.headerText || '');
    const footerText = showForm ? formFooterText : (selectedTemplate?.footerText || '');
    const buttons = showForm ? formButtons : (() => {
      try { return selectedTemplate?.buttonsJson ? JSON.parse(selectedTemplate.buttonsJson) : []; }
      catch { return []; }
    })();

    return (
      <div style={styles.preview}>
        <div style={styles.previewLabel}>Preview</div>
        <div style={styles.previewPhone}>
          {/* Header */}
          {headerType === 'TEXT' && headerText && (
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
              {headerText}
            </div>
          )}
          {headerType !== 'NONE' && headerType !== 'TEXT' && (
            <div style={{
              backgroundColor: '#e5e7eb', borderRadius: '8px', padding: '24px',
              textAlign: 'center' as const, marginBottom: '8px', fontSize: '12px', color: '#888',
            }}>
              [{headerType}]
            </div>
          )}

          {/* Body */}
          <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' as const }}>
            {body || 'Template body text...'}
          </div>

          {/* Footer */}
          {footerText && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>{footerText}</div>
          )}

          {/* Buttons */}
          {buttons.length > 0 && (
            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '12px', paddingTop: '8px' }}>
              {buttons.map((btn: TemplateButton, i: number) => (
                <div key={i} style={styles.previewBtn}>
                  {btn.type === 'URL' ? '🔗' : btn.type === 'PHONE_NUMBER' ? '📞' : '↩️'} {btn.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>WhatsApp Templates</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
            Create and manage message templates for WhatsApp Business
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {inboxes.length > 0 && (
            <select
              value={selectedInboxId}
              onChange={e => setSelectedInboxId(e.target.value ? Number(e.target.value) : '')}
              style={styles.select}
            >
              <option value="">All Inboxes</option>
              {inboxes.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          )}
          {selectedInboxId && (
            <button
              onClick={() => handleSync(selectedInboxId as number)}
              disabled={syncing}
              style={{ ...styles.secondaryBtn, opacity: syncing ? 0.6 : 1 }}
            >
              {syncing ? 'Syncing...' : 'Sync from Meta'}
            </button>
          )}
          <button onClick={() => { resetForm(); setShowForm(true); }} style={styles.primaryBtn}>
            + New Template
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {successMsg && <div style={styles.success}>{successMsg}</div>}

      {inboxes.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📱</div>
          <h3>No WhatsApp Inboxes Found</h3>
          <p>Create a WhatsApp inbox first in the Inboxes page to start managing templates.</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
          <div style={{ ...styles.card, flex: 1 }}>
            <h3 style={styles.cardTitle}>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.field}>
                  <label style={styles.label}>WhatsApp Inbox *</label>
                  <select value={formInboxId} onChange={e => setFormInboxId(Number(e.target.value))}
                    style={styles.input} required disabled={!!editingTemplate}>
                    <option value="">Select inbox</option>
                    {inboxes.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Category *</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={styles.input}>
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.field}>
                  <label style={styles.label}>Template Name *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                    style={styles.input} required placeholder="e.g., order_confirmation"
                    pattern="[a-z0-9_]+" title="Lowercase letters, numbers, underscores only"
                    disabled={!!editingTemplate} />
                  <p style={styles.hint}>Lowercase, underscores only (e.g., welcome_message)</p>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Language *</label>
                  <select value={formLanguage} onChange={e => setFormLanguage(e.target.value)} style={styles.input}>
                    {languageOptions.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Header */}
              <div style={styles.field}>
                <label style={styles.label}>Header</label>
                <select value={formHeaderType} onChange={e => setFormHeaderType(e.target.value)} style={styles.input}>
                  <option value="NONE">No Header</option>
                  <option value="TEXT">Text</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document</option>
                </select>
              </div>

              {formHeaderType === 'TEXT' && (
                <div style={styles.field}>
                  <label style={styles.label}>Header Text</label>
                  <input type="text" value={formHeaderText} onChange={e => setFormHeaderText(e.target.value)}
                    style={styles.input} placeholder="Header text (use {{1}} for variables)" />
                </div>
              )}

              {/* Body */}
              <div style={styles.field}>
                <label style={styles.label}>Body Text *</label>
                <textarea value={formBody} onChange={e => setFormBody(e.target.value)}
                  style={{ ...styles.input, minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' as const }}
                  required placeholder="Hello {{1}}, your order {{2}} is confirmed. Thank you!" />
                <p style={styles.hint}>
                  Use {'{{1}}'}, {'{{2}}'}, etc. for dynamic values.
                  {formBody && ` (${countParams(formBody)} variable${countParams(formBody) !== 1 ? 's' : ''} detected)`}
                </p>
              </div>

              {/* Footer */}
              <div style={styles.field}>
                <label style={styles.label}>Footer (optional)</label>
                <input type="text" value={formFooterText} onChange={e => setFormFooterText(e.target.value)}
                  style={styles.input} placeholder="e.g., Reply STOP to unsubscribe" />
              </div>

              {/* Buttons */}
              <div style={styles.field}>
                <label style={styles.label}>
                  Buttons (optional, max 3)
                  {formButtons.length < 3 && (
                    <button type="button" onClick={addButton}
                      style={{ marginLeft: '12px', fontSize: '12px', color: '#1b72e8', background: 'none', border: 'none', cursor: 'pointer' }}>
                      + Add Button
                    </button>
                  )}
                </label>
                {formButtons.map((btn, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <select value={btn.type} onChange={e => updateButton(i, 'type', e.target.value)}
                      style={{ ...styles.input, maxWidth: '160px' }}>
                      <option value="QUICK_REPLY">Quick Reply</option>
                      <option value="URL">URL Button</option>
                      <option value="PHONE_NUMBER">Call Button</option>
                    </select>
                    <input type="text" value={btn.text} onChange={e => updateButton(i, 'text', e.target.value)}
                      style={styles.input} placeholder="Button text" required />
                    {btn.type === 'URL' && (
                      <input type="url" value={btn.url || ''} onChange={e => updateButton(i, 'url', e.target.value)}
                        style={styles.input} placeholder="https://..." required />
                    )}
                    {btn.type === 'PHONE_NUMBER' && (
                      <input type="tel" value={btn.phoneNumber || ''} onChange={e => updateButton(i, 'phoneNumber', e.target.value)}
                        style={styles.input} placeholder="+1234567890" required />
                    )}
                    <button type="button" onClick={() => removeButton(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '18px' }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={styles.primaryBtn}>
                  {editingTemplate ? 'Update Template' : 'Create & Submit to Meta'}
                </button>
                <button type="button" onClick={resetForm} style={styles.secondaryBtn}>Cancel</button>
              </div>
            </form>
          </div>

          {/* Preview */}
          {renderPreview()}
        </div>
      )}

      {/* Template List */}
      {!showForm && templates.length > 0 && (
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={styles.card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Template</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Language</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Variables</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => {
                    const sc = statusColors[t.status] || statusColors.PENDING;
                    return (
                      <tr key={t.id}
                        style={{
                          ...styles.tr,
                          backgroundColor: selectedTemplate?.id === t.id ? '#f0f7ff' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedTemplate(t)}
                      >
                        <td style={styles.td}>
                          <div style={{ fontWeight: 500 }}>{t.name}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{t.inboxName}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.categoryBadge}>
                            {categoryLabels[t.category] || t.category}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontSize: '13px' }}>
                            {languageOptions.find(l => l.value === t.language)?.label || t.language}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                            backgroundColor: sc.bg, color: sc.color,
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {t.bodyParamCount > 0 ? (
                            <span style={{ fontSize: '13px', color: '#666' }}>
                              {t.bodyParamCount} param{t.bodyParamCount !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#ccc' }}>None</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                            style={styles.actionBtn}>Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                            style={{ ...styles.actionBtn, color: '#dc2626' }}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail / Preview Panel */}
          {selectedTemplate && (
            <div style={{ width: '320px', flexShrink: 0 }}>
              {renderPreview()}

              {/* Detail info */}
              <div style={styles.card}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                    backgroundColor: (statusColors[selectedTemplate.status] || statusColors.PENDING).bg,
                    color: (statusColors[selectedTemplate.status] || statusColors.PENDING).color,
                  }}>
                    {selectedTemplate.status}
                  </span>
                </div>
                {selectedTemplate.rejectionReason && (
                  <div style={{ ...styles.error, marginTop: '8px', fontSize: '12px' }}>
                    Rejection reason: {selectedTemplate.rejectionReason}
                  </div>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Meta ID</span>
                  <span style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                    {selectedTemplate.externalId || 'Not synced'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Created</span>
                  <span style={{ fontSize: '13px', color: '#666' }}>
                    {new Date(selectedTemplate.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!showForm && templates.length === 0 && inboxes.length > 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
          <h3>No Templates Yet</h3>
          <p>Create a new template or sync existing ones from Meta.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={styles.primaryBtn}>
              + Create Template
            </button>
            {inboxes.length > 0 && (
              <button onClick={() => handleSync(inboxes[0].id)} style={styles.secondaryBtn}>
                Sync from Meta
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px',
  },
  card: {
    backgroundColor: '#fff', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', marginBottom: '16px',
  },
  cardTitle: { margin: '0 0 16px', fontSize: '16px', color: '#333' },
  field: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' },
  input: {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
    borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
  },
  select: {
    padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px',
    fontSize: '14px', outline: 'none', backgroundColor: '#fff',
  },
  hint: { fontSize: '11px', color: '#999', marginTop: '4px' },
  primaryBtn: {
    padding: '8px 20px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
  },
  secondaryBtn: {
    padding: '8px 20px', backgroundColor: '#fff', color: '#333',
    border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
  },
  error: {
    backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
  },
  success: {
    backgroundColor: '#f0fdf4', color: '#15803d', padding: '12px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center' as const, padding: '60px 20px',
    backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    color: '#666',
  },
  th: {
    textAlign: 'left' as const, padding: '10px 8px', borderBottom: '2px solid #eee',
    fontSize: '12px', color: '#888', textTransform: 'uppercase' as const,
  },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 8px', fontSize: '14px' },
  actionBtn: {
    padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid #ddd',
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '4px', color: '#333',
  },
  categoryBadge: {
    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
    backgroundColor: '#f3f4f6', color: '#555',
  },
  preview: { width: '320px', flexShrink: 0 },
  previewLabel: {
    fontSize: '12px', fontWeight: 600, color: '#888',
    textTransform: 'uppercase' as const, marginBottom: '8px',
  },
  previewPhone: {
    backgroundColor: '#e5f6e3', borderRadius: '8px', padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px',
  },
  previewBtn: {
    textAlign: 'center' as const, padding: '8px', fontSize: '13px',
    color: '#1b72e8', fontWeight: 500, borderBottom: '1px solid #e5e7eb',
    cursor: 'default',
  },
  detailRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid #f5f5f5',
  },
  detailLabel: { fontSize: '13px', color: '#888' },
};

export default WhatsAppTemplatesPage;
