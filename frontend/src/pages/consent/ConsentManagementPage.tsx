import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { consentApi, ConsentResponse, ConsentStats, AuditEntry, ConsentDetailResponse } from '../../api/consent';

const ConsentManagementPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [consents, setConsents] = useState<ConsentResponse[]>([]);
  const [stats, setStats] = useState<ConsentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'OPT_IN' | 'OPT_OUT'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail panel
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [detail, setDetail] = useState<ConsentDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkNote, setBulkNote] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Manual update
  const [updateNote, setUpdateNote] = useState('');

  useEffect(() => {
    if (!currentAccountId) return;
    loadData();
  }, [currentAccountId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [consentsRes, statsRes] = await Promise.all([
        consentApi.getAll(currentAccountId!),
        consentApi.getStats(currentAccountId!),
      ]);
      setConsents(consentsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load consent data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (contactId: number) => {
    setSelectedContact(contactId);
    setLoadingDetail(true);
    try {
      const res = await consentApi.getDetail(currentAccountId!, contactId);
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleConsent = async (contactId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'OPT_IN' ? 'OPT_OUT' : 'OPT_IN';
    const action = newStatus === 'OPT_OUT' ? 'opt out' : 'opt back in';
    if (!window.confirm(`Are you sure you want to ${action} this contact?`)) return;

    try {
      await consentApi.update(currentAccountId!, contactId, {
        status: newStatus as 'OPT_IN' | 'OPT_OUT',
        notes: updateNote || `Manual ${action} by agent`,
      });
      setUpdateNote('');
      loadData();
      if (selectedContact === contactId) loadDetail(contactId);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  const handleBulkOptOut = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await consentApi.bulkOptOut(
        currentAccountId!,
        Array.from(selectedIds),
        bulkNote || 'Bulk opt-out by agent'
      );
      alert(`${res.data.optedOutCount} contact(s) opted out`);
      setSelectedIds(new Set());
      setShowBulkModal(false);
      setBulkNote('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to bulk opt-out');
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.contactId)));
    }
  };

  // Filtering
  const filtered = consents
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (c.contactName && c.contactName.toLowerCase().includes(q)) ||
             (c.contactPhone && c.contactPhone.includes(q)) ||
             (c.contactEmail && c.contactEmail.toLowerCase().includes(q));
    });

  const formatDate = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case 'AUTO_KEYWORD': return 'Auto (keyword)';
      case 'MANUAL': return 'Manual';
      case 'IMPORT': return 'Import';
      case 'API': return 'API';
      default: return source;
    }
  };

  const optedInContacts = filtered.filter(c => c.status === 'OPT_IN');
  const optedOutContacts = filtered.filter(c => c.status === 'OPT_OUT');

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#111' }}>Opt-in / Opt-out Management</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            WhatsApp compliance: track consent, auto-handle STOP messages, avoid account bans
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button onClick={() => setShowBulkModal(true)} style={{ ...styles.dangerBtn }}>
            Bulk Opt-Out ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#111' }}>{stats.totalContacts}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Total Tracked</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a' }}>{stats.optedIn}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Opted In</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626' }}>{stats.optedOut}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Opted Out</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1b72e8' }}>{stats.optInRate}%</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Opt-In Rate</div>
            {/* Visual bar */}
            <div style={{ width: '100%', height: '4px', background: '#fee2e2', borderRadius: '2px', marginTop: '8px' }}>
              <div style={{ width: `${stats.optInRate}%`, height: '100%', background: '#16a34a', borderRadius: '2px' }} />
            </div>
          </div>
        </div>
      )}

      {/* Compliance Info Banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px',
        padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '20px' }}>{'\u26A0\uFE0F'}</span>
        <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
          <strong>WhatsApp Compliance:</strong> Contacts who send <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: '3px' }}>STOP</code>,{' '}
          <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: '3px' }}>UNSUBSCRIBE</code>, or similar keywords are automatically opted out.
          Opted-out contacts are blocked from broadcasts and scheduled messages. They can re-subscribe by sending{' '}
          <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: '3px' }}>START</code>.
        </div>
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f0f0f0', borderRadius: '8px', padding: '3px' }}>
          {(['all', 'OPT_IN', 'OPT_OUT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 500,
                backgroundColor: filter === f ? '#fff' : 'transparent',
                color: filter === f ? '#1b72e8' : '#666',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {f === 'all' ? 'All' : f === 'OPT_IN' ? 'Opted In' : 'Opted Out'}
              {f === 'OPT_OUT' && stats && stats.optedOut > 0 && (
                <span style={{ marginLeft: '4px', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>
                  {stats.optedOut}
                </span>
              )}
            </button>
          ))}
        </div>

        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone, or email..."
          style={{ ...styles.input, width: '280px' }}
        />
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Left: Contact List */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{'\uD83D\uDCCB'}</div>
              <h3 style={{ margin: '0 0 8px', color: '#333' }}>No consent records</h3>
              <p style={{ color: '#666', margin: 0 }}>
                Consent records are created automatically when contacts message your WhatsApp number.
              </p>
            </div>
          ) : (
            <>
              {/* Select all */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#666' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={selectAll}
                />
                <span>{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filtered.map(consent => (
                  <div
                    key={consent.contactId}
                    onClick={() => loadDetail(consent.contactId)}
                    style={{
                      ...styles.card,
                      cursor: 'pointer',
                      borderLeft: consent.status === 'OPT_OUT' ? '3px solid #dc2626' : '3px solid #16a34a',
                      backgroundColor: selectedContact === consent.contactId ? '#f0f7ff' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(consent.contactId)}
                        onChange={e => { e.stopPropagation(); toggleSelect(consent.contactId); }}
                        onClick={e => e.stopPropagation()}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: '#111' }}>
                            {consent.contactName || 'Unknown'}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                            backgroundColor: consent.status === 'OPT_IN' ? '#dcfce7' : '#fee2e2',
                            color: consent.status === 'OPT_IN' ? '#166534' : '#991b1b',
                          }}>
                            {consent.status === 'OPT_IN' ? 'Opted In' : 'Opted Out'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                          {consent.contactPhone || 'No phone'}
                          {consent.contactEmail && ` · ${consent.contactEmail}`}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#999' }}>
                        <div>{sourceLabel(consent.source)}</div>
                        {consent.triggerKeyword && (
                          <div style={{ marginTop: '2px' }}>
                            Keyword: <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>{consent.triggerKeyword}</code>
                          </div>
                        )}
                        <div style={{ marginTop: '2px' }}>{formatDate(consent.updatedAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Detail Panel */}
        {selectedContact && (
          <div style={{ width: '380px', flexShrink: 0 }}>
            <div style={{ ...styles.card, position: 'sticky', top: '20px' }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
              ) : detail ? (
                <>
                  {/* Contact Info */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>{detail.consent.contactName}</h3>
                        <div style={{ fontSize: '13px', color: '#666' }}>{detail.consent.contactPhone}</div>
                        {detail.consent.contactEmail && (
                          <div style={{ fontSize: '13px', color: '#666' }}>{detail.consent.contactEmail}</div>
                        )}
                      </div>
                      <button onClick={() => setSelectedContact(null)} style={styles.closeBtn}>&times;</button>
                    </div>
                  </div>

                  {/* Current Status */}
                  <div style={{
                    padding: '14px', borderRadius: '10px', marginBottom: '16px',
                    background: detail.consent.status === 'OPT_IN' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${detail.consent.status === 'OPT_IN' ? '#bbf7d0' : '#fecaca'}`,
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: detail.consent.status === 'OPT_IN' ? '#166534' : '#991b1b' }}>
                      {detail.consent.status === 'OPT_IN' ? '\u2705 Opted In — Can receive messages' : '\u274C Opted Out — Messages blocked'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Via: {sourceLabel(detail.consent.source)}
                      {detail.consent.triggerKeyword && ` (keyword: "${detail.consent.triggerKeyword}")`}
                    </div>
                    {detail.consent.status === 'OPT_OUT' && detail.consent.optedOutAt && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        Since: {formatDate(detail.consent.optedOutAt)}
                      </div>
                    )}
                    {detail.consent.notes && (
                      <div style={{ fontSize: '12px', color: '#555', marginTop: '4px', fontStyle: 'italic' }}>
                        Note: {detail.consent.notes}
                      </div>
                    )}
                  </div>

                  {/* Toggle Action */}
                  <div style={{ marginBottom: '16px' }}>
                    <input
                      value={updateNote}
                      onChange={e => setUpdateNote(e.target.value)}
                      placeholder="Reason for change (optional)..."
                      style={{ ...styles.input, marginBottom: '8px' }}
                    />
                    <button
                      onClick={() => handleToggleConsent(detail.consent.contactId, detail.consent.status)}
                      style={detail.consent.status === 'OPT_IN' ? styles.dangerBtn : styles.successBtn}
                    >
                      {detail.consent.status === 'OPT_IN' ? 'Opt Out This Contact' : 'Re-subscribe This Contact'}
                    </button>
                  </div>

                  {/* Audit Trail */}
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#333' }}>
                      Consent History ({detail.auditTrail.length})
                    </h4>
                    {detail.auditTrail.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#888' }}>No history yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {detail.auditTrail.map((entry, idx) => (
                          <div key={entry.id} style={{ display: 'flex', gap: '10px', position: 'relative', paddingBottom: '16px' }}>
                            {/* Timeline line */}
                            {idx < detail.auditTrail.length - 1 && (
                              <div style={{
                                position: 'absolute', left: '7px', top: '18px', bottom: '0',
                                width: '2px', background: '#e5e7eb',
                              }} />
                            )}
                            {/* Timeline dot */}
                            <div style={{
                              width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                              background: entry.newStatus === 'OPT_OUT' ? '#dc2626' : '#16a34a',
                              border: '3px solid #fff', boxShadow: '0 0 0 1px #e5e7eb',
                            }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>
                                {entry.previousStatus
                                  ? `${entry.previousStatus === 'OPT_IN' ? 'Opted In' : 'Opted Out'} → ${entry.newStatus === 'OPT_IN' ? 'Opted In' : 'Opted Out'}`
                                  : `Set to ${entry.newStatus === 'OPT_IN' ? 'Opted In' : 'Opted Out'}`
                                }
                              </div>
                              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                {sourceLabel(entry.source)}
                                {entry.triggerKeyword && ` — "${entry.triggerKeyword}"`}
                              </div>
                              {entry.notes && (
                                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                                  {entry.notes}
                                </div>
                              )}
                              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                                {formatDate(entry.createdAt)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Failed to load</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Opt-Out Modal */}
      {showBulkModal && (
        <div style={styles.overlay} onClick={() => setShowBulkModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Bulk Opt-Out</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
              You are about to opt out <strong>{selectedIds.size}</strong> contact{selectedIds.size !== 1 ? 's' : ''}.
              They will no longer receive broadcasts or scheduled messages.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Reason (optional)</label>
              <textarea
                value={bulkNote}
                onChange={e => setBulkNote(e.target.value)}
                placeholder="e.g., Compliance request, customer feedback..."
                style={{ ...styles.input, minHeight: '60px', resize: 'vertical' as const }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBulkModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleBulkOptOut} style={styles.dangerBtn}>
                Confirm Opt-Out ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#fff', borderRadius: '10px', padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  statCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center',
  },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' as const,
    outline: 'none',
  },
  label: {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '6px',
  },
  dangerBtn: {
    padding: '10px 20px', backgroundColor: '#dc2626', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
    width: '100%',
  },
  successBtn: {
    padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
    width: '100%',
  },
  cancelBtn: {
    padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#333',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
    color: '#999', lineHeight: '1',
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '28px',
    width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
};

export default ConsentManagementPage;
