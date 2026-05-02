import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { scheduledMessagesApi, ScheduledMessageResponse, ScheduledMessageRequest } from '../../api/scheduledMessages';
import { broadcastsApi, BroadcastResponse } from '../../api/broadcasts';

interface InboxOption { id: number; name: string; }
interface ContactOption { id: number; name: string; phoneNumber: string; }
interface TemplateOption { id: number; name: string; body: string; bodyParamCount: number; status: string; }

const ScheduledMessagesPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [messages, setMessages] = useState<ScheduledMessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'>('all');

  // Create form state
  const [scheduleType, setScheduleType] = useState<'DIRECT' | 'TEMPLATE' | 'BROADCAST'>('DIRECT');
  const [selectedInbox, setSelectedInbox] = useState<number>(0);
  const [selectedContact, setSelectedContact] = useState<number>(0);
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [bodyParams, setBodyParams] = useState<string[]>([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState<number>(0);
  const [scheduledAt, setScheduledAt] = useState('');
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Lookup data
  const [inboxes, setInboxes] = useState<InboxOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastResponse[]>([]);

  // Edit modal
  const [editItem, setEditItem] = useState<ScheduledMessageResponse | null>(null);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    if (!currentAccountId) return;
    loadMessages();
    loadLookups();
  }, [currentAccountId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await scheduledMessagesApi.getAll(currentAccountId!);
      setMessages(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load scheduled messages');
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [inboxRes, contactRes, templateRes, broadcastRes] = await Promise.all([
        (await import('../../api/inboxes')).inboxesApi.getInboxes(currentAccountId!),
        (await import('../../api/contacts')).contactsApi.getContacts(currentAccountId!),
        (await import('../../api/whatsappTemplates')).whatsappTemplatesApi.getTemplates(currentAccountId!),
        broadcastsApi.getBroadcasts(currentAccountId!),
      ]);
      setInboxes(inboxRes.data.map((i: any) => ({ id: i.id, name: i.name })));
      setContacts(
        (Array.isArray(contactRes.data) ? contactRes.data : (contactRes.data as any).content || [])
          .filter((c: any) => c.phoneNumber)
          .map((c: any) => ({ id: c.id, name: c.name, phoneNumber: c.phoneNumber }))
      );
      setTemplates(
        templateRes.data
          .filter((t: any) => t.status === 'APPROVED')
          .map((t: any) => ({ id: t.id, name: t.name, body: t.body, bodyParamCount: t.bodyParamCount || 0, status: t.status }))
      );
      setBroadcasts(broadcastRes.data.filter((b: any) => b.status === 'DRAFT' || b.status === 'SCHEDULED'));
    } catch { /* ignore lookup errors */ }
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      const data: ScheduledMessageRequest = {
        scheduleType,
        inboxId: selectedInbox,
        scheduledAt,
        label: label || undefined,
      };

      if (scheduleType === 'DIRECT') {
        data.contactId = selectedContact;
        data.content = content;
      } else if (scheduleType === 'TEMPLATE') {
        data.contactId = selectedContact;
        data.templateId = selectedTemplate;
        if (bodyParams.length > 0) data.bodyParams = bodyParams;
      } else if (scheduleType === 'BROADCAST') {
        data.broadcastId = selectedBroadcast;
      }

      await scheduledMessagesApi.create(currentAccountId!, data);
      setShowCreate(false);
      resetForm();
      loadMessages();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.response?.data?.error || 'Failed to schedule');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this scheduled message?')) return;
    try {
      await scheduledMessagesApi.cancel(currentAccountId!, id);
      loadMessages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this scheduled message?')) return;
    try {
      await scheduledMessagesApi.delete(currentAccountId!, id);
      loadMessages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    try {
      await scheduledMessagesApi.update(currentAccountId!, editItem.id, {
        scheduledAt: editScheduledAt,
        content: editContent || undefined,
        label: editLabel || undefined,
      });
      setEditItem(null);
      loadMessages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update');
    }
  };

  const openEdit = (item: ScheduledMessageResponse) => {
    setEditItem(item);
    setEditScheduledAt(item.scheduledAt ? item.scheduledAt.slice(0, 16) : '');
    setEditContent(item.content || '');
    setEditLabel(item.label || '');
  };

  const resetForm = () => {
    setScheduleType('DIRECT');
    setSelectedInbox(0);
    setSelectedContact(0);
    setContent('');
    setSelectedTemplate(0);
    setBodyParams([]);
    setSelectedBroadcast(0);
    setScheduledAt('');
    setLabel('');
    setCreateError('');
  };

  const handleTemplateChange = (templateId: number) => {
    setSelectedTemplate(templateId);
    const t = templates.find(t => t.id === templateId);
    if (t && t.bodyParamCount > 0) {
      setBodyParams(Array(t.bodyParamCount).fill(''));
    } else {
      setBodyParams([]);
    }
  };

  // Helper to format datetime nicely
  const formatDateTime = (iso: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const timeUntil = (iso: string) => {
    const target = new Date(iso).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return 'Due now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
    const days = Math.floor(hrs / 24);
    return `in ${days}d ${hrs % 24}h`;
  };

  // Quick schedule helpers
  const setQuickTime = (label: string) => {
    const now = new Date();
    let target: Date;
    switch (label) {
      case '1h':
        target = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case '3h':
        target = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        break;
      case 'tomorrow9am':
        target = new Date(now);
        target.setDate(target.getDate() + 1);
        target.setHours(9, 0, 0, 0);
        break;
      case 'tomorrow10am':
        target = new Date(now);
        target.setDate(target.getDate() + 1);
        target.setHours(10, 0, 0, 0);
        break;
      case 'nextMonday9am':
        target = new Date(now);
        const daysUntilMon = ((8 - target.getDay()) % 7) || 7;
        target.setDate(target.getDate() + daysUntilMon);
        target.setHours(9, 0, 0, 0);
        break;
      default:
        return;
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    setScheduledAt(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  const filtered = filter === 'all' ? messages : messages.filter(m => m.status === filter);

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#fef3c7', color: '#92400e' };
      case 'PROCESSING': return { bg: '#dbeafe', color: '#1e40af' };
      case 'SENT': return { bg: '#dcfce7', color: '#166534' };
      case 'FAILED': return { bg: '#fee2e2', color: '#991b1b' };
      case 'CANCELLED': return { bg: 'var(--surface-3)', color: 'var(--ink-2)' };
      default: return { bg: 'var(--surface-3)', color: 'var(--ink-2)' };
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'DIRECT': return '\u2709\uFE0F';
      case 'TEMPLATE': return '\uD83D\uDCC4';
      case 'BROADCAST': return '\uD83D\uDCE2';
      default: return '\uD83D\uDCE8';
    }
  };

  const pendingCount = messages.filter(m => m.status === 'PENDING').length;

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--ink)' }}>Scheduled Messages</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: '14px' }}>
            {pendingCount > 0 ? `${pendingCount} message${pendingCount > 1 ? 's' : ''} pending` : 'Schedule messages and broadcasts for optimal send times'}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }} style={styles.primaryBtn}>
          + Schedule Message
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f0f0f0', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
        {(['all', 'PENDING', 'SENT', 'FAILED', 'CANCELLED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500,
              backgroundColor: filter === f ? 'var(--surface)' : 'transparent',
              color: filter === f ? 'var(--accent)' : 'var(--ink-3)',
              boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            {f === 'PENDING' && pendingCount > 0 && (
              <span style={{ marginLeft: '4px', background: '#fbbf24', color: '#92400e', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</div>}

      {/* Messages List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink-3)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{'\u23F0'}</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>No scheduled messages</h3>
          <p style={{ color: 'var(--ink-3)', margin: 0 }}>
            Schedule messages, templates, or broadcasts to send at the perfect time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(msg => {
            const sc = statusColor(msg.status);
            return (
              <div key={msg.id} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                    <div style={{ fontSize: '28px', lineHeight: '1' }}>{typeIcon(msg.scheduleType)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>
                          {msg.scheduleType === 'DIRECT' ? 'Direct Message' :
                           msg.scheduleType === 'TEMPLATE' ? `Template: ${msg.templateName}` :
                           `Broadcast: ${msg.broadcastName}`}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: sc.bg, color: sc.color,
                        }}>
                          {msg.status}
                        </span>
                      </div>

                      {msg.label && (
                        <div style={{ fontSize: '13px', color: 'var(--ink-3)', marginBottom: '4px', fontStyle: 'italic' }}>
                          {msg.label}
                        </div>
                      )}

                      {/* Recipient info */}
                      {msg.contactName && (
                        <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>
                          To: <strong>{msg.contactName}</strong> ({msg.contactPhone})
                        </div>
                      )}

                      {/* Content preview */}
                      {msg.content && (
                        <div style={{
                          fontSize: '13px', color: '#555', marginTop: '4px',
                          background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px',
                          maxHeight: '60px', overflow: 'hidden',
                        }}>
                          {msg.content}
                        </div>
                      )}

                      {/* Template params */}
                      {msg.bodyParams && msg.bodyParams.length > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '4px' }}>
                          Params: {msg.bodyParams.join(', ')}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: 'var(--ink-3)' }}>
                        <span>Inbox: {msg.inboxName}</span>
                        <span>Created: {formatDateTime(msg.createdAt)}</span>
                        {msg.sentAt && <span>Sent: {formatDateTime(msg.sentAt)}</span>}
                        {msg.failureReason && (
                          <span style={{ color: 'var(--danger)' }}>Error: {msg.failureReason}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: schedule time + actions */}
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                      {formatDateTime(msg.scheduledAt)}
                    </div>
                    {msg.status === 'PENDING' && (
                      <div style={{ fontSize: '12px', color: 'var(--warn)', fontWeight: 500, marginTop: '2px' }}>
                        {timeUntil(msg.scheduledAt)}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      {msg.status === 'PENDING' && (
                        <>
                          <button onClick={() => openEdit(msg)} style={styles.smallBtn} title="Edit">
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancel(msg.id)}
                            style={{ ...styles.smallBtn, color: 'var(--warn)', borderColor: 'var(--warn)' }}
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {(msg.status === 'SENT' || msg.status === 'FAILED' || msg.status === 'CANCELLED') && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          style={{ ...styles.smallBtn, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          title="Delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="app-modal-overlay" style={styles.overlay} onClick={() => setShowCreate(false)}>
          <div className="app-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Schedule a Message</h3>
              <button onClick={() => setShowCreate(false)} style={styles.closeBtn}>&times;</button>
            </div>

            {createError && (
              <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px', padding: '8px 12px', background: '#fee2e2', borderRadius: '6px' }}>
                {createError}
              </div>
            )}

            {/* Schedule Type */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['DIRECT', 'TEMPLATE', 'BROADCAST'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setScheduleType(t)}
                    style={{
                      ...styles.typeBtn,
                      borderColor: scheduleType === t ? 'var(--accent)' : 'var(--line)',
                      backgroundColor: scheduleType === t ? '#eff6ff' : 'var(--surface)',
                      color: scheduleType === t ? 'var(--accent)' : 'var(--ink-3)',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{typeIcon(t)}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>
                      {t === 'DIRECT' ? 'Direct Text' : t === 'TEMPLATE' ? 'Template' : 'Broadcast'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inbox */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Inbox *</label>
              <select
                value={selectedInbox}
                onChange={e => setSelectedInbox(Number(e.target.value))}
                style={styles.input}
              >
                <option value={0}>Select inbox...</option>
                {inboxes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>

            {/* Contact (DIRECT / TEMPLATE) */}
            {(scheduleType === 'DIRECT' || scheduleType === 'TEMPLATE') && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Recipient *</label>
                <select
                  value={selectedContact}
                  onChange={e => setSelectedContact(Number(e.target.value))}
                  style={styles.input}
                >
                  <option value={0}>Select contact...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phoneNumber})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Content (DIRECT) */}
            {scheduleType === 'DIRECT' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Message *</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Type your message..."
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' as const }}
                />
              </div>
            )}

            {/* Template (TEMPLATE) */}
            {scheduleType === 'TEMPLATE' && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Template *</label>
                  <select
                    value={selectedTemplate}
                    onChange={e => handleTemplateChange(Number(e.target.value))}
                    style={styles.input}
                  >
                    <option value={0}>Select template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                {selectedTemplate > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--ink-3)', background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                    {templates.find(t => t.id === selectedTemplate)?.body || ''}
                  </div>
                )}
                {bodyParams.length > 0 && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Template Parameters</label>
                    {bodyParams.map((p, idx) => (
                      <input
                        key={idx}
                        value={p}
                        onChange={e => {
                          const newParams = [...bodyParams];
                          newParams[idx] = e.target.value;
                          setBodyParams(newParams);
                        }}
                        placeholder={`Parameter {{${idx + 1}}} — use {{name}}, {{phone}}, etc.`}
                        style={{ ...styles.input, marginBottom: '6px' }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Broadcast (BROADCAST) */}
            {scheduleType === 'BROADCAST' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Broadcast *</label>
                <select
                  value={selectedBroadcast}
                  onChange={e => setSelectedBroadcast(Number(e.target.value))}
                  style={styles.input}
                >
                  <option value={0}>Select broadcast...</option>
                  {broadcasts.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.totalCount} recipients) — {b.status}
                    </option>
                  ))}
                </select>
                {broadcasts.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '4px' }}>
                    No draft/scheduled broadcasts available. Create a broadcast first.
                  </div>
                )}
              </div>
            )}

            {/* Schedule Time */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Send At *</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                style={styles.input}
              />
              {/* Quick time buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setQuickTime('1h')} style={styles.quickBtn}>In 1 hour</button>
                <button onClick={() => setQuickTime('3h')} style={styles.quickBtn}>In 3 hours</button>
                <button onClick={() => setQuickTime('tomorrow9am')} style={styles.quickBtn}>Tomorrow 9 AM</button>
                <button onClick={() => setQuickTime('tomorrow10am')} style={styles.quickBtn}>Tomorrow 10 AM</button>
                <button onClick={() => setQuickTime('nextMonday9am')} style={styles.quickBtn}>Next Monday 9 AM</button>
              </div>
            </div>

            {/* Label */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Label / Note (optional)</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder='e.g., "Monday promo blast", "Follow-up with John"'
                style={styles.input}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowCreate(false)} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !selectedInbox || !scheduledAt ||
                  (scheduleType === 'DIRECT' && (!selectedContact || !content)) ||
                  (scheduleType === 'TEMPLATE' && (!selectedContact || !selectedTemplate)) ||
                  (scheduleType === 'BROADCAST' && !selectedBroadcast)
                }
                style={{
                  ...styles.primaryBtn,
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div style={styles.overlay} onClick={() => setEditItem(null)}>
          <div style={{ ...styles.modal, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Edit Scheduled Message</h3>
              <button onClick={() => setEditItem(null)} style={styles.closeBtn}>&times;</button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Send At</label>
              <input
                type="datetime-local"
                value={editScheduledAt}
                onChange={e => setEditScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                style={styles.input}
              />
            </div>

            {editItem.scheduleType === 'DIRECT' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Message</label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' as const }}
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Label / Note</label>
              <input value={editLabel} onChange={e => setEditLabel(e.target.value)} style={styles.input} />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setEditItem(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleUpdate} style={styles.primaryBtn}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--surface)', borderRadius: '12px', padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  primaryBtn: {
    padding: '10px 20px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
  },
  cancelBtn: {
    padding: '10px 20px', backgroundColor: 'var(--surface-3)', color: 'var(--ink)',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
  },
  smallBtn: {
    padding: '4px 10px', border: '1px solid var(--line)', borderRadius: '6px',
    backgroundColor: 'var(--surface)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: 'var(--ink)',
  },
  overlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--surface)', borderRadius: '12px', padding: '28px',
    width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
    color: 'var(--ink-4)', lineHeight: '1',
  },
  formGroup: { marginBottom: '16px' },
  label: {
    display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink)',
    marginBottom: '6px',
  },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' as const,
    outline: 'none',
  },
  typeBtn: {
    flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    gap: '6px', padding: '12px 8px', border: '2px solid var(--line)', borderRadius: '10px',
    cursor: 'pointer', backgroundColor: 'var(--surface)', transition: 'all 0.15s',
  },
  quickBtn: {
    padding: '4px 10px', border: '1px solid var(--line)', borderRadius: '14px',
    backgroundColor: 'var(--surface-2)', cursor: 'pointer', fontSize: '12px', color: '#555',
  },
};

export default ScheduledMessagesPage;
