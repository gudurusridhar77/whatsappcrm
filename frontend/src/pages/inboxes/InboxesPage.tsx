import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { inboxesApi, Inbox, CreateInboxRequest } from '../../api/inboxes';

const channelLabels: Record<string, string> = {
  WEB_WIDGET: 'Web Widget',
  API: 'API',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
};

const channelColors: Record<string, string> = {
  WEB_WIDGET: '#1b72e8',
  API: '#6b7280',
  EMAIL: '#059669',
  WHATSAPP: '#25d366',
};

const InboxesPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState('');

  // Create form
  const [formName, setFormName] = useState('');
  const [formChannelType, setFormChannelType] = useState('WEB_WIDGET');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formWelcomeTitle, setFormWelcomeTitle] = useState('Hi there!');
  const [formWelcomeTagline, setFormWelcomeTagline] = useState('We make it simple to connect with us.');
  const [formWidgetColor, setFormWidgetColor] = useState('#1b72e8');
  const [formGreeting, setFormGreeting] = useState('');
  // Email form fields
  const [formEmailAddress, setFormEmailAddress] = useState('');
  const [formSmtpHost, setFormSmtpHost] = useState('');
  const [formSmtpPort, setFormSmtpPort] = useState(587);
  const [formSmtpUsername, setFormSmtpUsername] = useState('');
  const [formSmtpPassword, setFormSmtpPassword] = useState('');
  const [formSmtpTls, setFormSmtpTls] = useState(true);
  const [formImapHost, setFormImapHost] = useState('');
  const [formImapPort, setFormImapPort] = useState(993);
  const [formImapUsername, setFormImapUsername] = useState('');
  const [formImapPassword, setFormImapPassword] = useState('');
  const [formImapSsl, setFormImapSsl] = useState(true);
  const [formForwardToEmail, setFormForwardToEmail] = useState('');
  const [formSignature, setFormSignature] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  // Pre-chat form toggle
  const [formPreChatEnabled, setFormPreChatEnabled] = useState(false);
  // WhatsApp form fields
  const [formWaPhoneNumber, setFormWaPhoneNumber] = useState('');
  const [formWaPhoneNumberId, setFormWaPhoneNumberId] = useState('');
  const [formWaWabaId, setFormWaWabaId] = useState('');
  const [formWaAccessToken, setFormWaAccessToken] = useState('');
  const [formWaBusinessName, setFormWaBusinessName] = useState('');
  const [formWaApiBaseUrl, setFormWaApiBaseUrl] = useState('https://graph.facebook.com/v21.0');

  const loadInboxes = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await inboxesApi.getInboxes(currentAccountId);
      setInboxes(res.data);
    } catch {
      setError('Failed to load inboxes');
    }
  }, [currentAccountId]);

  useEffect(() => {
    loadInboxes();
  }, [loadInboxes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    setError('');
    try {
      const data: CreateInboxRequest = {
        name: formName,
        channelType: formChannelType,
        greetingEnabled: formGreeting.length > 0,
        greetingMessage: formGreeting || undefined,
      };
      if (formChannelType === 'WEB_WIDGET') {
        data.websiteUrl = formWebsiteUrl;
        data.welcomeTitle = formWelcomeTitle;
        data.welcomeTagline = formWelcomeTagline;
        data.widgetColor = formWidgetColor;
        data.preChatFormEnabled = formPreChatEnabled;
      }
      if (formChannelType === 'EMAIL') {
        data.emailAddress = formEmailAddress;
        data.smtpHost = formSmtpHost;
        data.smtpPort = formSmtpPort;
        data.smtpUsername = formSmtpUsername;
        data.smtpPassword = formSmtpPassword;
        data.smtpTls = formSmtpTls;
        data.imapHost = formImapHost || undefined;
        data.imapPort = formImapPort || undefined;
        data.imapUsername = formImapUsername || undefined;
        data.imapPassword = formImapPassword || undefined;
        data.imapSsl = formImapSsl;
        data.forwardToEmail = formForwardToEmail || undefined;
        data.signature = formSignature || undefined;
      }
      if (formChannelType === 'WHATSAPP') {
        data.whatsappPhoneNumber = formWaPhoneNumber;
        data.whatsappPhoneNumberId = formWaPhoneNumberId;
        data.whatsappWabaId = formWaWabaId || undefined;
        data.whatsappAccessToken = formWaAccessToken;
        data.whatsappBusinessName = formWaBusinessName || undefined;
        data.whatsappApiBaseUrl = formWaApiBaseUrl || undefined;
      }
      await inboxesApi.createInbox(currentAccountId, data);
      resetForm();
      loadInboxes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create inbox');
    }
  };

  const handleDelete = async (inbox: Inbox) => {
    if (!currentAccountId) return;
    const count = inbox.conversationCount || 0;
    const warning = count > 0
      ? `⚠️ WARNING: This inbox has ${count} conversation${count !== 1 ? 's' : ''}. Deleting it will permanently remove ALL conversations, messages, and CSAT surveys associated with this inbox.\n\nThis action CANNOT be undone.\n\nType "DELETE" to confirm:`
      : 'Delete this inbox? This cannot be undone.';

    if (count > 0) {
      const input = window.prompt(warning);
      if (input !== 'DELETE') return;
    } else {
      if (!window.confirm(warning)) return;
    }

    try {
      await inboxesApi.deleteInbox(currentAccountId, inbox.id);
      setSelectedInbox(null);
      loadInboxes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete inbox');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormName('');
    setFormChannelType('WEB_WIDGET');
    setFormWebsiteUrl('');
    setFormWelcomeTitle('Hi there!');
    setFormWelcomeTagline('We make it simple to connect with us.');
    setFormWidgetColor('#1b72e8');
    setFormGreeting('');
    setFormPreChatEnabled(false);
    setFormEmailAddress('');
    setFormSmtpHost('');
    setFormSmtpPort(587);
    setFormSmtpUsername('');
    setFormSmtpPassword('');
    setFormSmtpTls(true);
    setFormImapHost('');
    setFormImapPort(993);
    setFormImapUsername('');
    setFormImapPassword('');
    setFormImapSsl(true);
    setFormForwardToEmail('');
    setFormSignature('');
    setFormWaPhoneNumber('');
    setFormWaPhoneNumberId('');
    setFormWaWabaId('');
    setFormWaAccessToken('');
    setFormWaBusinessName('');
    setFormWaApiBaseUrl('https://graph.facebook.com/v21.0');
  };

  const handleTestSmtp = async (inboxId: number) => {
    if (!currentAccountId) return;
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await inboxesApi.testSmtp(currentAccountId, inboxId);
      setSmtpTestResult({ success: res.data.success, message: res.data.success ? 'SMTP connection successful!' : 'SMTP connection failed.' });
    } catch {
      setSmtpTestResult({ success: false, message: 'Failed to test SMTP connection.' });
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Inboxes</h2>
        <button onClick={() => setShowForm(true)} style={styles.primaryBtn}>+ New Inbox</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Create Inbox Modal */}
      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 20px 0' }}>Create New Inbox</h3>
            <form onSubmit={handleCreate}>
              <div style={styles.field}>
                <label style={styles.label}>Inbox Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  style={styles.input} required placeholder="e.g. Website Chat, Support Email" />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Channel Type *</label>
                <select value={formChannelType} onChange={(e) => setFormChannelType(e.target.value)} style={styles.input}>
                  <option value="WEB_WIDGET">Web Widget (Live Chat)</option>
                  <option value="API">API Channel</option>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp (Meta Business API)</option>
                </select>
              </div>

              {formChannelType === 'WEB_WIDGET' && (
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Website URL</label>
                    <input type="url" value={formWebsiteUrl} onChange={(e) => setFormWebsiteUrl(e.target.value)}
                      style={styles.input} placeholder="https://yourwebsite.com" />
                  </div>
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>Welcome Title</label>
                      <input type="text" value={formWelcomeTitle} onChange={(e) => setFormWelcomeTitle(e.target.value)}
                        style={styles.input} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Widget Color</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="color" value={formWidgetColor} onChange={(e) => setFormWidgetColor(e.target.value)}
                          style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer' }} />
                        <input type="text" value={formWidgetColor} onChange={(e) => setFormWidgetColor(e.target.value)}
                          style={{ ...styles.input, flex: 1 }} />
                      </div>
                    </div>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Welcome Tagline</label>
                    <input type="text" value={formWelcomeTagline} onChange={(e) => setFormWelcomeTagline(e.target.value)}
                      style={styles.input} />
                  </div>
                  <div style={styles.field}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formPreChatEnabled}
                        onChange={(e) => setFormPreChatEnabled(e.target.checked)} />
                      Enable Pre-Chat Form
                    </label>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      When enabled, visitors must enter their name and email before starting a conversation.
                      This helps identify contacts and enables follow-up via email.
                    </p>
                  </div>
                </>
              )}

              {formChannelType === 'EMAIL' && (
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Email Address *</label>
                    <input type="email" value={formEmailAddress} onChange={(e) => setFormEmailAddress(e.target.value)}
                      style={styles.input} required placeholder="support@yourcompany.com" />
                  </div>

                  <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#555' }}>SMTP Settings (Outgoing Mail)</h4>
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>SMTP Host *</label>
                      <input type="text" value={formSmtpHost} onChange={(e) => setFormSmtpHost(e.target.value)}
                        style={styles.input} required placeholder="smtp.gmail.com" />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>SMTP Port</label>
                      <input type="number" value={formSmtpPort} onChange={(e) => setFormSmtpPort(parseInt(e.target.value))}
                        style={styles.input} />
                    </div>
                  </div>
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>SMTP Username</label>
                      <input type="text" value={formSmtpUsername} onChange={(e) => setFormSmtpUsername(e.target.value)}
                        style={styles.input} placeholder="username" />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>SMTP Password</label>
                      <input type="password" value={formSmtpPassword} onChange={(e) => setFormSmtpPassword(e.target.value)}
                        style={styles.input} placeholder="••••••••" />
                    </div>
                  </div>
                  <div style={styles.field}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={formSmtpTls} onChange={(e) => setFormSmtpTls(e.target.checked)} />
                      Enable TLS/STARTTLS
                    </label>
                  </div>

                  <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#555' }}>IMAP Settings (Incoming Mail - Optional)</h4>
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>IMAP Host</label>
                      <input type="text" value={formImapHost} onChange={(e) => setFormImapHost(e.target.value)}
                        style={styles.input} placeholder="imap.gmail.com" />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>IMAP Port</label>
                      <input type="number" value={formImapPort} onChange={(e) => setFormImapPort(parseInt(e.target.value))}
                        style={styles.input} />
                    </div>
                  </div>
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>IMAP Username</label>
                      <input type="text" value={formImapUsername} onChange={(e) => setFormImapUsername(e.target.value)}
                        style={styles.input} placeholder="username" />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>IMAP Password</label>
                      <input type="password" value={formImapPassword} onChange={(e) => setFormImapPassword(e.target.value)}
                        style={styles.input} placeholder="••••••••" />
                    </div>
                  </div>
                  <div style={styles.field}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={formImapSsl} onChange={(e) => setFormImapSsl(e.target.checked)} />
                      Enable SSL
                    </label>
                  </div>

                  <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#555' }}>Additional Settings</h4>
                  <div style={styles.field}>
                    <label style={styles.label}>Forward To Email</label>
                    <input type="email" value={formForwardToEmail} onChange={(e) => setFormForwardToEmail(e.target.value)}
                      style={styles.input} placeholder="forward@yourcompany.com" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Email Signature</label>
                    <textarea value={formSignature} onChange={(e) => setFormSignature(e.target.value)}
                      style={{ ...styles.input, minHeight: '60px', resize: 'vertical' as const }}
                      placeholder="Your email signature (HTML supported)" />
                  </div>
                </>
              )}

              {formChannelType === 'WHATSAPP' && (
                <>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', color: '#166534' }}>
                    <strong>Setup Guide:</strong> You need a <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" style={{ color: '#15803d' }}>Meta Business API</a> account.
                    Get your Phone Number ID, WABA ID, and Permanent Access Token from the Meta Developer Dashboard.
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>WhatsApp Phone Number *</label>
                    <input type="text" value={formWaPhoneNumber} onChange={(e) => setFormWaPhoneNumber(e.target.value)}
                      style={styles.input} required placeholder="+1234567890" />
                  </div>

                  <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#555' }}>Meta API Configuration</h4>
                  <div style={styles.field}>
                    <label style={styles.label}>Phone Number ID *</label>
                    <input type="text" value={formWaPhoneNumberId} onChange={(e) => setFormWaPhoneNumberId(e.target.value)}
                      style={styles.input} required placeholder="e.g. 1234567890123456" />
                    <small style={{ color: '#999', fontSize: '11px' }}>Found in Meta Developer Dashboard → WhatsApp → API Setup</small>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>WhatsApp Business Account ID</label>
                    <input type="text" value={formWaWabaId} onChange={(e) => setFormWaWabaId(e.target.value)}
                      style={styles.input} placeholder="e.g. 1234567890123456" />
                    <small style={{ color: '#999', fontSize: '11px' }}>Your WABA ID from Meta Business Manager</small>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Permanent Access Token *</label>
                    <input type="password" value={formWaAccessToken} onChange={(e) => setFormWaAccessToken(e.target.value)}
                      style={styles.input} required placeholder="EAAxxxxxxx..." />
                    <small style={{ color: '#999', fontSize: '11px' }}>System User token with whatsapp_business_messaging permission</small>
                  </div>

                  <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#555' }}>Business Details</h4>
                  <div style={styles.field}>
                    <label style={styles.label}>Business Name</label>
                    <input type="text" value={formWaBusinessName} onChange={(e) => setFormWaBusinessName(e.target.value)}
                      style={styles.input} placeholder="Your Business Name" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>API Base URL</label>
                    <input type="text" value={formWaApiBaseUrl} onChange={(e) => setFormWaApiBaseUrl(e.target.value)}
                      style={styles.input} placeholder="https://graph.facebook.com/v21.0" />
                    <small style={{ color: '#999', fontSize: '11px' }}>Default: https://graph.facebook.com/v21.0</small>
                  </div>
                </>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Greeting Message (optional)</label>
                <textarea value={formGreeting} onChange={(e) => setFormGreeting(e.target.value)}
                  style={{ ...styles.input, minHeight: '60px', resize: 'vertical' as const }}
                  placeholder="Auto-sent when a new conversation starts" />
              </div>

              <div style={styles.formActions}>
                <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.primaryBtn}>Create Inbox</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inbox List */}
      <div style={styles.grid}>
        {inboxes.length === 0 ? (
          <div style={styles.empty}>No inboxes yet. Create your first inbox to start receiving messages!</div>
        ) : (
          inboxes.map((inbox) => (
            <div key={inbox.id} style={styles.card} onClick={() => setSelectedInbox(inbox)}>
              <div style={styles.cardHeader}>
                <div>
                  <span style={{
                    ...styles.channelBadge,
                    backgroundColor: channelColors[inbox.channelType] || '#6b7280',
                  }}>
                    {channelLabels[inbox.channelType] || inbox.channelType}
                  </span>
                  {!inbox.active && <span style={styles.inactiveBadge}>Inactive</span>}
                </div>
              </div>
              <h3 style={styles.cardTitle}>{inbox.name}</h3>
              {inbox.webWidgetConfig?.websiteUrl && (
                <p style={styles.cardMeta}>{inbox.webWidgetConfig.websiteUrl}</p>
              )}
              {inbox.emailConfig?.emailAddress && (
                <p style={styles.cardMeta}>{inbox.emailConfig.emailAddress}</p>
              )}
              {inbox.whatsappConfig?.phoneNumber && (
                <p style={styles.cardMeta}>{inbox.whatsappConfig.phoneNumber}{inbox.whatsappConfig.businessName ? ` · ${inbox.whatsappConfig.businessName}` : ''}</p>
              )}
              <p style={styles.cardMeta}>
                {inbox.conversationCount || 0} conversation{inbox.conversationCount !== 1 ? 's' : ''} · Created {new Date(inbox.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Inbox Detail Panel */}
      {selectedInbox && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{selectedInbox.name}</h3>
              <span style={{
                ...styles.channelBadge,
                backgroundColor: channelColors[selectedInbox.channelType] || '#6b7280',
              }}>
                {channelLabels[selectedInbox.channelType]}
              </span>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Inbox Token</span>
                <code style={styles.codeBlock}>{selectedInbox.token}</code>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Auto Assignment</span>
                <span>{selectedInbox.enableAutoAssignment ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status</span>
                <span>{selectedInbox.active ? 'Active' : 'Inactive'}</span>
              </div>
              {selectedInbox.greetingMessage && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Greeting</span>
                  <span>{selectedInbox.greetingMessage}</span>
                </div>
              )}
            </div>

            {selectedInbox.webWidgetConfig && (
              <div style={styles.detailSection}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>Widget Configuration</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Website</span>
                  <span>{selectedInbox.webWidgetConfig.websiteUrl || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Title</span>
                  <span>{selectedInbox.webWidgetConfig.welcomeTitle}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Tagline</span>
                  <span>{selectedInbox.webWidgetConfig.welcomeTagline}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Color</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '4px',
                      backgroundColor: selectedInbox.webWidgetConfig.widgetColor,
                    }} />
                    <span>{selectedInbox.webWidgetConfig.widgetColor}</span>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Pre-Chat Form</span>
                  <span style={{
                    color: selectedInbox.webWidgetConfig.preChatFormEnabled ? '#059669' : '#999',
                    fontWeight: 500,
                  }}>
                    {selectedInbox.webWidgetConfig.preChatFormEnabled ? '✓ Enabled' : 'Disabled'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Reply Time</span>
                  <span>{selectedInbox.webWidgetConfig.replyTime || 'in a few minutes'}</span>
                </div>
              </div>
            )}

            {selectedInbox.emailConfig && (
              <div style={styles.detailSection}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>Email Configuration</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Email Address</span>
                  <span>{selectedInbox.emailConfig.emailAddress}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>SMTP</span>
                  <span>{selectedInbox.emailConfig.smtpEnabled
                    ? `${selectedInbox.emailConfig.smtpHost}:${selectedInbox.emailConfig.smtpPort}${selectedInbox.emailConfig.smtpTls ? ' (TLS)' : ''}`
                    : 'Not configured'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>IMAP</span>
                  <span>{selectedInbox.emailConfig.imapEnabled
                    ? `${selectedInbox.emailConfig.imapHost}:${selectedInbox.emailConfig.imapPort}${selectedInbox.emailConfig.imapSsl ? ' (SSL)' : ''}`
                    : 'Not configured'}</span>
                </div>
                {selectedInbox.emailConfig.forwardToEmail && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Forward To</span>
                    <span>{selectedInbox.emailConfig.forwardToEmail}</span>
                  </div>
                )}
                {selectedInbox.emailConfig.signature && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Signature</span>
                    <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedInbox.emailConfig.signature}</span>
                  </div>
                )}
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => handleTestSmtp(selectedInbox.id)}
                    disabled={testingSmtp}
                    style={{ ...styles.primaryBtn, backgroundColor: '#059669', opacity: testingSmtp ? 0.6 : 1 }}>
                    {testingSmtp ? 'Testing...' : 'Test SMTP Connection'}
                  </button>
                  {smtpTestResult && (
                    <span style={{
                      marginLeft: '12px', fontSize: '13px',
                      color: smtpTestResult.success ? '#059669' : '#dc2626',
                    }}>
                      {smtpTestResult.message}
                    </span>
                  )}
                </div>
              </div>
            )}

            {selectedInbox.whatsappConfig && (
              <div style={styles.detailSection}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>WhatsApp Configuration</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Phone Number</span>
                  <span>{selectedInbox.whatsappConfig.phoneNumber}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Phone Number ID</span>
                  <code style={styles.codeBlock}>{selectedInbox.whatsappConfig.phoneNumberId}</code>
                </div>
                {selectedInbox.whatsappConfig.wabaId && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>WABA ID</span>
                    <code style={styles.codeBlock}>{selectedInbox.whatsappConfig.wabaId}</code>
                  </div>
                )}
                {selectedInbox.whatsappConfig.businessName && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Business Name</span>
                    <span>{selectedInbox.whatsappConfig.businessName}</span>
                  </div>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Provider</span>
                  <span style={{ textTransform: 'capitalize' }}>{selectedInbox.whatsappConfig.provider?.replace('_', ' ')}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>API Base URL</span>
                  <span style={{ fontSize: '12px' }}>{selectedInbox.whatsappConfig.apiBaseUrl}</span>
                </div>

                <div style={{ ...styles.detailSection, borderTop: '1px dashed #e5e7eb' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Webhook Setup</h4>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 8px 0' }}>
                    Configure this URL in your Meta App Dashboard → WhatsApp → Configuration → Callback URL:
                  </p>
                  <code style={{ ...styles.codeBlock, fontSize: '12px', wordBreak: 'break-all' as const, display: 'block', marginBottom: '8px' }}>
                    {`${window.location.protocol}//${window.location.hostname}:8080/public/whatsapp/webhook`}
                  </code>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Verify Token</span>
                    <code style={styles.codeBlock}>{selectedInbox.whatsappConfig.webhookVerifyToken}</code>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0 0' }}>
                    Subscribe to: messages, message_deliveries, message_reads
                  </p>
                </div>
              </div>
            )}

            {selectedInbox.channelType === 'WEB_WIDGET' && (
              <div style={styles.detailSection}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Embed Widget on Your Website</h4>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                  Add this code before the closing <code>&lt;/body&gt;</code> tag:
                </p>
                <pre style={{ fontSize: '11px', wordBreak: 'break-all' as const, whiteSpace: 'pre-wrap' as const, padding: '12px', backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: '6px', lineHeight: '1.5' }}>
{`<script>
  window.chatwootSettings = {
    token: "${selectedInbox.token}",
    baseUrl: "${window.location.protocol}//${window.location.hostname}:8080"
  };
</script>
<script src="${window.location.protocol}//${window.location.hostname}:8080/widget.js" defer></script>`}
                </pre>
                <button
                  onClick={() => {
                    const code = `<script>\n  window.chatwootSettings = {\n    token: "${selectedInbox.token}",\n    baseUrl: "${window.location.protocol}//${window.location.hostname}:8080"\n  };\n</script>\n<script src="${window.location.protocol}//${window.location.hostname}:8080/widget.js" defer></script>`;
                    navigator.clipboard.writeText(code);
                    alert('Widget embed code copied to clipboard!');
                  }}
                  style={{ marginTop: '8px', padding: '6px 14px', fontSize: '12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Copy Embed Code
                </button>
              </div>
            )}

            <div style={styles.formActions}>
              <button onClick={() => handleDelete(selectedInbox)}
                style={{ ...styles.cancelBtn, color: '#dc2626', borderColor: '#fca5a5' }}>
                Delete Inbox
              </button>
              <button onClick={() => setSelectedInbox(null)} style={styles.primaryBtn}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
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
  error: {
    backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
  },
  empty: {
    textAlign: 'center' as const, color: '#999', padding: '40px', fontSize: '14px',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px',
  },
  card: {
    border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px',
    cursor: 'pointer', transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '8px',
  },
  cardTitle: { margin: '0 0 4px 0', fontSize: '16px', color: '#333' },
  cardMeta: { margin: '0 0 2px 0', fontSize: '13px', color: '#999' },
  channelBadge: {
    padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
    fontWeight: 600, color: '#fff', textTransform: 'uppercase' as const,
  },
  inactiveBadge: {
    padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
    backgroundColor: '#fef2f2', color: '#dc2626', marginLeft: '6px',
  },
  modalOverlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '8px', padding: '24px',
    width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' as const,
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
  detailSection: {
    borderTop: '1px solid #f0f0f0', paddingTop: '16px', marginTop: '16px',
  },
  detailRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', fontSize: '14px',
  },
  detailLabel: { color: '#666', fontWeight: 500 },
  codeBlock: {
    backgroundColor: '#f3f4f6', padding: '6px 10px', borderRadius: '4px',
    fontSize: '13px', fontFamily: 'monospace',
  },
};

export default InboxesPage;
