import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { accountApi } from '../../api/account';
import { AccountSettings } from '../../types';

const timezones = [
  'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore',
  'Australia/Sydney', 'Pacific/Auckland',
  'America/Sao_Paulo', 'Africa/Cairo',
];

const AccountSettingsPage: React.FC = () => {
  const { user, currentAccountId } = useAuth();
  const currentAccount = user?.accounts.find(a => a.accountId === currentAccountId);
  const isAdmin = currentAccount?.role === 'ADMIN';

  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [locale, setLocale] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [autoResolveHours, setAutoResolveHours] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, [currentAccountId]);

  const loadSettings = async () => {
    if (!currentAccountId) return;
    try {
      const res = await accountApi.getSettings(currentAccountId);
      setSettings(res.data);
      setName(res.data.name || '');
      setDomain(res.data.domain || '');
      setLocale(res.data.locale || '');
      setTimezone(res.data.timezone || 'UTC');
      setAutoResolveHours(res.data.autoResolveHours || 0);
    } catch {
      setError('Failed to load account settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    setMsg('');
    setError('');
    try {
      const res = await accountApi.updateSettings(currentAccountId, {
        name, domain, locale, timezone, autoResolveHours,
      });
      setSettings(res.data);
      setMsg('Account settings updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '640px' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: '20px', color: '#333' }}>Account Settings</h2>

      {/* Account Info */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>General</h3>
        {msg && <div style={styles.success}>{msg}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSave}>
          <div style={styles.field}>
            <label style={styles.label}>Account Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              style={styles.input} required disabled={!isAdmin} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Domain</label>
            <input type="text" value={domain} onChange={e => setDomain(e.target.value)}
              style={styles.input} placeholder="yourcompany.com" disabled={!isAdmin} />
            <p style={styles.hint}>Your company's website domain</p>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Locale / Language</label>
            <select value={locale} onChange={e => setLocale(e.target.value)}
              style={styles.input} disabled={!isAdmin}>
              <option value="">Default</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
              <option value="hi">Hindi</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              style={styles.input} disabled={!isAdmin}>
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <p style={styles.hint}>Used for business hours and report date calculations</p>
          </div>

          {isAdmin && (
            <button type="submit" style={styles.primaryBtn}>Save Settings</button>
          )}
        </form>
      </div>

      {/* Conversation Settings */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Conversation Settings</h3>

        <form onSubmit={handleSave}>
          <div style={styles.field}>
            <label style={styles.label}>Auto-Resolve After (hours)</label>
            <input type="number" value={autoResolveHours} min={0} max={720}
              onChange={e => setAutoResolveHours(parseInt(e.target.value) || 0)}
              style={{ ...styles.input, maxWidth: '200px' }} disabled={!isAdmin} />
            <p style={styles.hint}>
              {autoResolveHours === 0
                ? 'Auto-resolve is disabled. Conversations must be resolved manually.'
                : `Conversations will be automatically resolved after ${autoResolveHours} hours of inactivity.`}
            </p>
          </div>

          {isAdmin && (
            <button type="submit" style={styles.primaryBtn}>Save Settings</button>
          )}
        </form>
      </div>

      {/* Account Info (read-only) */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Account Information</h3>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Account ID</span>
          <span style={styles.infoValue}>{settings?.id}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Status</span>
          <span style={{
            padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
            backgroundColor: settings?.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
            color: settings?.status === 'ACTIVE' ? '#15803d' : '#dc2626',
          }}>
            {settings?.status}
          </span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Your Role</span>
          <span style={{
            padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
            backgroundColor: currentAccount?.role === 'ADMIN' ? '#dbeafe' : '#f3f4f6',
            color: currentAccount?.role === 'ADMIN' ? '#1d4ed8' : '#374151',
          }}>
            {currentAccount?.role}
          </span>
        </div>
      </div>

      {!isAdmin && (
        <div style={{
          padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px',
          border: '1px solid #fbbf24', fontSize: '14px', color: '#92400e',
        }}>
          Only administrators can modify account settings. Contact your admin for changes.
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#fff', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px',
    marginBottom: '20px',
  },
  cardTitle: { margin: '0 0 16px', fontSize: '16px', color: '#333' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
  },
  hint: { fontSize: '12px', color: '#999', marginTop: '4px' },
  primaryBtn: {
    padding: '10px 24px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
  },
  success: {
    backgroundColor: '#f0fdf4', color: '#15803d', padding: '12px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
  },
  error: {
    backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
  },
  infoRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid #f0f0f0',
  },
  infoLabel: { fontSize: '14px', color: '#666' },
  infoValue: { fontSize: '14px', fontWeight: 500, color: '#333' },
};

export default AccountSettingsPage;
