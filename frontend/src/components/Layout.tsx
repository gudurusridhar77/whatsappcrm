import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import SearchBar from './SearchBar';
import NotificationBell from './NotificationBell';

const availabilityColors: Record<string, string> = {
  ONLINE: '#22c55e',
  BUSY: '#f59e0b',
  OFFLINE: '#9ca3af',
};

const availabilityLabels: Record<string, string> = {
  ONLINE: 'Online',
  BUSY: 'Busy',
  OFFLINE: 'Offline',
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, currentAccountId, updateUser } = useAuth();
  const location = useLocation();
  const currentAccount = user?.accounts.find(a => a.accountId === currentAccountId);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAvailability = async (status: string) => {
    try {
      const res = await authApi.updateAvailability(status);
      updateUser(res.data);
    } catch { /* ignore */ }
    setShowUserMenu(false);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/conversations', label: 'Conversations' },
    { path: '/contacts', label: 'Contacts' },
    { path: '/inboxes', label: 'Inboxes' },
    { path: '/labels', label: 'Labels' },
    { path: '/canned-responses', label: 'Canned Responses' },
    { path: '/teams', label: 'Teams' },
    { path: '/reports', label: 'Reports' },
    { path: '/automations', label: 'Automations' },
    { path: '/csat', label: 'CSAT' },
    { path: '/whatsapp-templates', label: 'WA Templates' },
    { path: '/broadcasts', label: 'Broadcasts' },
    { path: '/chatbot', label: 'Chatbot Flows' },
    { path: '/campaign-analytics', label: 'Campaign Analytics' },
    { path: '/scheduled-messages', label: 'Scheduled' },
  ];

  const availability = user?.availability || 'OFFLINE';

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>WhatsApp CRM</h1>
          {currentAccount && (
            <span style={styles.accountBadge}>{currentAccount.accountName}</span>
          )}
        </div>
        <SearchBar />
        <div style={styles.headerRight}>
          <NotificationBell />

          {/* User Menu with Availability */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={styles.userBtn}
            >
              <div style={styles.avatarContainer}>
                <div style={styles.avatarCircle}>
                  {(user?.displayName || user?.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{
                  ...styles.statusDot,
                  backgroundColor: availabilityColors[availability],
                }} />
              </div>
              <span style={styles.userName}>{user?.displayName || user?.name}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="white" style={{ marginLeft: '4px' }}>
                <path d="M3 5l3 3 3-3" stroke="white" strokeWidth="1.5" fill="none" />
              </svg>
            </button>

            {showUserMenu && (
              <div style={styles.userMenu}>
                <div style={styles.menuHeader}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{user?.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{user?.email}</div>
                </div>

                <div style={styles.menuDivider} />
                <div style={styles.menuLabel}>Set Status</div>

                {(['ONLINE', 'BUSY', 'OFFLINE'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => handleAvailability(status)}
                    style={{
                      ...styles.menuItem,
                      fontWeight: availability === status ? 600 : 400,
                      backgroundColor: availability === status ? '#f0f7ff' : 'transparent',
                    }}
                  >
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      backgroundColor: availabilityColors[status],
                      flexShrink: 0,
                    }} />
                    {availabilityLabels[status]}
                    {availability === status && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="#1b72e8" style={{ marginLeft: 'auto' }}>
                        <path d="M5.5 10.5L2 7l1-1 2.5 2.5L10.5 3.5 11.5 4.5z" />
                      </svg>
                    )}
                  </button>
                ))}

                <div style={styles.menuDivider} />
                <Link to="/settings/profile" style={styles.menuItem} onClick={() => setShowUserMenu(false)}>
                  Profile Settings
                </Link>
                <Link to="/settings/account" style={styles.menuItem} onClick={() => setShowUserMenu(false)}>
                  Account Settings
                </Link>

                <div style={styles.menuDivider} />
                <button onClick={logout} style={{ ...styles.menuItem, color: '#dc2626' }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav style={styles.nav}>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              ...styles.navLink,
              ...(location.pathname === item.path ? styles.navLinkActive : {}),
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main style={location.pathname === '/conversations' ? styles.mainFull : styles.main}>
        {children}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#f5f7fa', display: 'flex', flexDirection: 'column' as const },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 24px', backgroundColor: '#1b72e8', color: '#fff',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: { margin: 0, fontSize: '20px' },
  accountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 12px',
    borderRadius: '12px', fontSize: '13px',
  },
  userBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(255,255,255,0.15)', border: 'none',
    borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#fff',
  },
  avatarContainer: { position: 'relative' as const, width: '32px', height: '32px' },
  avatarCircle: {
    width: '32px', height: '32px', borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: 600, color: '#fff',
  },
  statusDot: {
    position: 'absolute' as const, bottom: '-1px', right: '-1px',
    width: '12px', height: '12px', borderRadius: '50%',
    border: '2px solid #1b72e8',
  },
  userName: { fontSize: '14px' },
  userMenu: {
    position: 'absolute' as const, top: '100%', right: 0, marginTop: '8px',
    width: '240px', backgroundColor: '#fff', borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 1000,
    overflow: 'hidden',
  },
  menuHeader: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0' },
  menuLabel: {
    padding: '8px 16px 4px', fontSize: '11px', fontWeight: 600,
    color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
    padding: '10px 16px', border: 'none', background: 'transparent',
    cursor: 'pointer', fontSize: '14px', color: '#333',
    textDecoration: 'none', textAlign: 'left' as const,
  },
  menuDivider: { height: '1px', backgroundColor: '#f0f0f0' },
  nav: {
    display: 'flex', gap: '0', backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb', padding: '0 24px',
  },
  navLink: {
    padding: '12px 16px', textDecoration: 'none', color: '#666',
    fontSize: '14px', fontWeight: 500, borderBottom: '2px solid transparent',
  },
  navLinkActive: {
    color: '#1b72e8', borderBottom: '2px solid #1b72e8',
  },
  main: { maxWidth: '960px', margin: '24px auto', padding: '0 24px', width: '100%' },
  mainFull: { margin: '0', padding: '0', flex: 1, overflow: 'hidden' as const },
};

export default Layout;
