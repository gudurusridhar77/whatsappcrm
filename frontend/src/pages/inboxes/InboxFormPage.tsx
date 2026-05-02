import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { inboxesApi, CreateInboxRequest } from '../../api/inboxes';

const InboxFormPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formChannelType, setFormChannelType] = useState('WEB_WIDGET');
  const [formGreeting, setFormGreeting] = useState('');

  // Web widget
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formWelcomeTitle, setFormWelcomeTitle] = useState('Hi there!');
  const [formWelcomeTagline, setFormWelcomeTagline] = useState('We make it simple to connect with us.');
  const [formWidgetColor, setFormWidgetColor] = useState('#1b72e8');
  const [formPreChatEnabled, setFormPreChatEnabled] = useState(false);

  // Email
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

  // WhatsApp
  const [formWaPhoneNumber, setFormWaPhoneNumber] = useState('');
  const [formWaPhoneNumberId, setFormWaPhoneNumberId] = useState('');
  const [formWaWabaId, setFormWaWabaId] = useState('');
  const [formWaAccessToken, setFormWaAccessToken] = useState('');
  const [formWaBusinessName, setFormWaBusinessName] = useState('');
  const [formWaApiBaseUrl, setFormWaApiBaseUrl] = useState('https://graph.facebook.com/v21.0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    setError(''); setLoading(true);
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
      navigate('/inboxes', { state: { created: true } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create inbox');
      setLoading(false);
    }
  };

  return (
    <div className="app-page-form" style={styles.page}>
      <div style={styles.headerBar}>
        <button onClick={() => navigate('/inboxes')} style={styles.backLink}>← Back to Inboxes</button>
        <h2 style={styles.title}>Create New Inbox</h2>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Basics</h3>
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
        </section>

        {formChannelType === 'WEB_WIDGET' && (
          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Web Widget</h3>
            <div style={styles.field}>
              <label style={styles.label}>Website URL</label>
              <input type="url" value={formWebsiteUrl} onChange={(e) => setFormWebsiteUrl(e.target.value)}
                style={styles.input} placeholder="https://yourwebsite.com" />
            </div>
            <div className="app-form-grid" style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Welcome Title</label>
                <input type="text" value={formWelcomeTitle} onChange={(e) => setFormWelcomeTitle(e.target.value)}
                  style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Widget Color</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
                  <input type="color" value={formWidgetColor} onChange={(e) => setFormWidgetColor(e.target.value)}
                    style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer', flexShrink: 0 }} />
                  <input type="text" value={formWidgetColor} onChange={(e) => setFormWidgetColor(e.target.value)}
                    style={{ ...styles.input, flex: 1, minWidth: 0 }} />
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
              <p style={styles.hint}>
                When enabled, visitors must enter their name and email before starting a conversation.
                This helps identify contacts and enables follow-up via email.
              </p>
            </div>
          </section>
        )}

        {formChannelType === 'EMAIL' && (
          <>
            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>Email</h3>
              <div style={styles.field}>
                <label style={styles.label}>Email Address *</label>
                <input type="email" value={formEmailAddress} onChange={(e) => setFormEmailAddress(e.target.value)}
                  style={styles.input} required placeholder="support@yourcompany.com" />
              </div>
            </section>

            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>SMTP (Outgoing)</h3>
              <div className="app-form-grid" style={styles.grid}>
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
              <div className="app-form-grid" style={styles.grid}>
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
            </section>

            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>IMAP (Incoming, Optional)</h3>
              <div className="app-form-grid" style={styles.grid}>
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
              <div className="app-form-grid" style={styles.grid}>
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
            </section>

            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>Additional Email Settings</h3>
              <div style={styles.field}>
                <label style={styles.label}>Forward To Email</label>
                <input type="email" value={formForwardToEmail} onChange={(e) => setFormForwardToEmail(e.target.value)}
                  style={styles.input} placeholder="forward@yourcompany.com" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email Signature</label>
                <textarea value={formSignature} onChange={(e) => setFormSignature(e.target.value)}
                  style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                  placeholder="Your email signature (HTML supported)" />
              </div>
            </section>
          </>
        )}

        {formChannelType === 'WHATSAPP' && (
          <>
            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>WhatsApp Setup</h3>
              <div style={styles.infoBlock}>
                <strong>Setup Guide:</strong> You need a{' '}
                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" style={{ color: '#15803d' }}>
                  Meta Business API
                </a>{' '}account. Get your Phone Number ID, WABA ID, and Permanent Access Token from the Meta Developer Dashboard.
              </div>
              <div style={styles.field}>
                <label style={styles.label}>WhatsApp Phone Number *</label>
                <input type="text" value={formWaPhoneNumber} onChange={(e) => setFormWaPhoneNumber(e.target.value)}
                  style={styles.input} required placeholder="+1234567890" />
              </div>
            </section>

            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>Meta API Configuration</h3>
              <div style={styles.field}>
                <label style={styles.label}>Phone Number ID *</label>
                <input type="text" value={formWaPhoneNumberId} onChange={(e) => setFormWaPhoneNumberId(e.target.value)}
                  style={styles.input} required placeholder="e.g. 1234567890123456" />
                <small style={styles.smallHint}>Found in Meta Developer Dashboard → WhatsApp → API Setup</small>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>WhatsApp Business Account ID</label>
                <input type="text" value={formWaWabaId} onChange={(e) => setFormWaWabaId(e.target.value)}
                  style={styles.input} placeholder="e.g. 1234567890123456" />
                <small style={styles.smallHint}>Your WABA ID from Meta Business Manager</small>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Permanent Access Token *</label>
                <input type="password" value={formWaAccessToken} onChange={(e) => setFormWaAccessToken(e.target.value)}
                  style={styles.input} required placeholder="EAAxxxxxxx..." />
                <small style={styles.smallHint}>System User token with whatsapp_business_messaging permission</small>
              </div>
            </section>

            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>Business Details</h3>
              <div style={styles.field}>
                <label style={styles.label}>Business Name</label>
                <input type="text" value={formWaBusinessName} onChange={(e) => setFormWaBusinessName(e.target.value)}
                  style={styles.input} placeholder="Your Business Name" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>API Base URL</label>
                <input type="text" value={formWaApiBaseUrl} onChange={(e) => setFormWaApiBaseUrl(e.target.value)}
                  style={styles.input} placeholder="https://graph.facebook.com/v21.0" />
                <small style={styles.smallHint}>Default: https://graph.facebook.com/v21.0</small>
              </div>
            </section>
          </>
        )}

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Greeting</h3>
          <div style={styles.field}>
            <label style={styles.label}>Greeting Message (optional)</label>
            <textarea value={formGreeting} onChange={(e) => setFormGreeting(e.target.value)}
              style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
              placeholder="Auto-sent when a new conversation starts" />
          </div>
        </section>

        <div className="app-form-actions" style={styles.actions}>
          <button type="button" onClick={() => navigate('/inboxes')} style={styles.cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading || !formName}
            style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Create Inbox'}
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
  hint: { fontSize: '12px', color: '#888', marginTop: '4px' },
  smallHint: { color: '#999', fontSize: '11px' },
  infoBlock: {
    backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '6px',
    marginBottom: '12px', fontSize: '13px', color: '#166534',
  },
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

export default InboxFormPage;
