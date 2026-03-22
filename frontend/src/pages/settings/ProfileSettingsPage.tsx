import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';

const availabilityOptions = [
  { value: 'ONLINE', label: 'Online', color: '#22c55e', desc: 'You are available to take conversations' },
  { value: 'BUSY', label: 'Busy', color: '#f59e0b', desc: 'You are available but occupied' },
  { value: 'OFFLINE', label: 'Offline', color: '#9ca3af', desc: 'You are not available' },
];

const ProfileSettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  // Password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    try {
      const res = await authApi.updateProfile({ name, displayName, avatarUrl });
      updateUser(res.data);
      setProfileMsg('Profile updated successfully');
    } catch (err: any) {
      setProfileErr(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdErr('');
    if (newPwd !== confirmPwd) {
      setPwdErr('New passwords do not match');
      return;
    }
    try {
      await authApi.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setPwdMsg('Password changed successfully');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      setPwdErr(err.response?.data?.error || 'Failed to change password');
    }
  };

  const handleAvailability = async (status: string) => {
    try {
      const res = await authApi.updateAvailability(status);
      updateUser(res.data);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: '20px', color: '#333' }}>Profile Settings</h2>

      {/* Availability Section */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Availability Status</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {availabilityOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleAvailability(opt.value)}
              style={{
                flex: 1, minWidth: '140px', padding: '16px',
                border: user?.availability === opt.value ? `2px solid ${opt.color}` : '2px solid #e5e7eb',
                borderRadius: '8px', cursor: 'pointer',
                backgroundColor: user?.availability === opt.value ? `${opt.color}10` : '#fff',
                textAlign: 'left' as const,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  backgroundColor: opt.color,
                }} />
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>{opt.label}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Section */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Personal Information</h3>
        {profileMsg && <div style={styles.success}>{profileMsg}</div>}
        {profileErr && <div style={styles.error}>{profileErr}</div>}

        <form onSubmit={handleProfileSave}>
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              style={styles.input} placeholder="Optional display name" />
            <p style={styles.hint}>This will be shown in conversations instead of your full name</p>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={user?.email || ''} style={{ ...styles.input, backgroundColor: '#f5f5f5' }}
              disabled />
            <p style={styles.hint}>Email cannot be changed</p>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Avatar URL</label>
            <input type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
              style={styles.input} placeholder="https://example.com/avatar.jpg" />
          </div>
          <button type="submit" style={styles.primaryBtn}>Save Profile</button>
        </form>
      </div>

      {/* Password Section */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Change Password</h3>
        {pwdMsg && <div style={styles.success}>{pwdMsg}</div>}
        {pwdErr && <div style={styles.error}>{pwdErr}</div>}

        <form onSubmit={handlePasswordChange}>
          <div style={styles.field}>
            <label style={styles.label}>Current Password</label>
            <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
              style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              style={styles.input} required minLength={6} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm New Password</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              style={styles.input} required minLength={6} />
          </div>
          <button type="submit" style={styles.primaryBtn}>Change Password</button>
        </form>
      </div>
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
};

export default ProfileSettingsPage;
