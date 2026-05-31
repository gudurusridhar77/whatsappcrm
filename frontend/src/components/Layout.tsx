import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import SearchBar from './SearchBar';
import NotificationBell from './NotificationBell';
import EnableNotificationsButton from './EnableNotificationsButton';

const availabilityColors: Record<string, string> = {
  ONLINE: 'var(--ok)',
  BUSY: 'var(--warn)',
  OFFLINE: 'var(--ink-4)',
};
const availabilityLabels: Record<string, string> = {
  ONLINE: 'Online', BUSY: 'Busy', OFFLINE: 'Offline',
};

// Primary nav lives in the sidebar; secondary items grouped below.
const PRIMARY = [
  { path: '/dashboard',     label: 'Overview',       icon: 'home' },
  { path: '/conversations', label: 'Conversations',  icon: 'chat' },
  { path: '/contacts',      label: 'Contacts',       icon: 'contact' },
  { path: '/inboxes',       label: 'Inboxes',        icon: 'inbox' },
  { path: '/broadcasts',    label: 'Broadcasts',     icon: 'megaphone' },
  { path: '/automations',   label: 'Automations',    icon: 'bot' },
  { path: '/reports',       label: 'Reports',        icon: 'chart' },
];
const SECONDARY = [
  { path: '/labels',              label: 'Labels',          icon: 'tag' },
  { path: '/canned-responses',    label: 'Canned Replies',  icon: 'layers' },
  { path: '/teams',               label: 'Teams',           icon: 'users' },
  { path: '/csat',                label: 'CSAT',            icon: 'star' },
  { path: '/whatsapp-templates',  label: 'Templates',       icon: 'doc' },
  { path: '/chatbot',             label: 'Chatbot Flows',   icon: 'bot' },
  { path: '/campaign-analytics',  label: 'Analytics',       icon: 'chart' },
  { path: '/scheduled-messages',  label: 'Scheduled',       icon: 'calendar' },
  { path: '/consent',             label: 'Consent',         icon: 'shield' },
];
// Bottom-tab subset on mobile. The rest live behind "More".
const BOTTOM_TABS = [
  { path: '/dashboard',     label: 'Overview',  icon: 'home' },
  { path: '/conversations', label: 'Chats',     icon: 'chat' },
  { path: '/contacts',      label: 'Contacts',  icon: 'contact' },
  { path: '__more',         label: 'More',      icon: 'menu' },
];

// Tiny inline-icon component (line icons, currentColor stroke)
const NavIcon: React.FC<{ name: string }> = ({ name }) => {
  const common = { width: 18, height: 18, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    home:     <><path d="M3 10l7-6 7 6v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" /><path d="M8 18v-5h4v5" /></>,
    chat:     <path d="M3 5h14v9H8l-4 3v-3H3V5z" />,
    contact:  <><circle cx="10" cy="8" r="3" /><path d="M4 17a6 6 0 0 1 12 0" /></>,
    inbox:    <><path d="M3 12l2-7h10l2 7" /><path d="M3 12v5h14v-5h-4l-1 2H8l-1-2H3z" /></>,
    megaphone:<><path d="M3 9v3l11 4V5L3 9z" /><path d="M14 8a3 3 0 0 1 0 5" /></>,
    bot:      <><rect x="4" y="6" width="12" height="10" rx="2" /><path d="M10 3v3" /><circle cx="8" cy="11" r=".8" fill="currentColor" /><circle cx="12" cy="11" r=".8" fill="currentColor" /></>,
    chart:    <path d="M3 17V8M8 17v-6M13 17V5M18 17v-9" />,
    tag:      <><path d="M11 3H4v7l8 8 7-7-8-8z" /><circle cx="7" cy="7" r=".8" fill="currentColor" /></>,
    layers:   <><path d="M10 3l8 4-8 4-8-4 8-4z" /><path d="M2 13l8 4 8-4" /></>,
    users:    <><circle cx="7" cy="8" r="3" /><path d="M2 17a5 5 0 0 1 10 0" /><circle cx="14" cy="7" r="2.5" /></>,
    star:     <path d="M10 3l2.4 4.9 5.4.8-3.9 3.8.9 5.3L10 15.3l-4.8 2.5.9-5.3L2.2 8.7l5.4-.8L10 3z" />,
    doc:      <><path d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M12 3v3h3" /></>,
    calendar: <><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v4M13 2v4" /></>,
    shield:   <><path d="M10 3l6 2v5c0 4-3 7-6 8-3-1-6-4-6-8V5l6-2z" /></>,
    menu:     <path d="M3 6h14M3 10h14M3 14h14" />,
    bell:     <><path d="M16 14a3 3 0 0 0-1-2.2V9a5 5 0 1 0-10 0v2.8A3 3 0 0 0 4 14h12z" /><path d="M8 17a2 2 0 0 0 4 0" /></>,
    settings: <><circle cx="10" cy="10" r="2.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2" /></>,
    chevron:  <path d="M5 8l5 5 5-5" />,
    close:    <path d="M5 5l10 10M15 5L5 15" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, currentAccountId, updateUser } = useAuth();
  const location = useLocation();
  const currentAccount = user?.accounts.find(a => a.accountId === currentAccountId);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Close mobile sheets on route change
  useEffect(() => { setShowMobileNav(false); setShowMore(false); }, [location.pathname]);

  const handleAvailability = async (status: string) => {
    try { const res = await authApi.updateAvailability(status); updateUser(res.data); } catch {}
    setShowUserMenu(false);
  };

  const availability = user?.availability || 'OFFLINE';
  const isConvFull = location.pathname === '/conversations';

  return (
    <div className="app-shell" style={S.shell}>
      {/* === Sidebar (desktop) === */}
      <aside className="app-sidebar" style={S.sidebar}>
        <div style={S.brand}>
          <div style={S.brandMark}>P</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0, flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Pulse</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentAccount?.accountName || 'Workspace'}
            </span>
          </div>
        </div>
        <nav style={S.navList}>
          {PRIMARY.map(it => (
            <NavLink key={it.path} item={it} active={location.pathname === it.path} />
          ))}
          <div style={{ height: 12 }} />
          <div style={S.navHeading}>Workspace</div>
          {SECONDARY.map(it => (
            <NavLink key={it.path} item={it} active={location.pathname === it.path} />
          ))}
        </nav>
        <UserBlock user={user} availability={availability} />
      </aside>

      {/* === Main column === */}
      <div style={S.mainCol}>
        {/* TopBar */}
        <header className="app-header" style={S.header}>
          <button className="app-menu-btn" style={S.menuBtn} onClick={() => setShowMobileNav(true)} aria-label="Open menu">
            <NavIcon name="menu" />
          </button>
          <h1 style={S.title}>{titleFor(location.pathname)}</h1>
          <div className="app-search-wrapper" style={S.searchWrap}>
            <SearchBar />
          </div>
          <EnableNotificationsButton />
          <NotificationBell />
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} style={S.userBtn}>
              <div style={S.avatarWrap}>
                <div style={S.avatar}>{(user?.displayName || user?.name || '?').charAt(0).toUpperCase()}</div>
                <span style={{ ...S.presence, background: availabilityColors[availability] }} />
              </div>
              <span className="app-user-name" style={S.userName}>{user?.displayName || user?.name}</span>
              <NavIcon name="chevron" />
            </button>
            {showUserMenu && (
              <div style={S.userMenu}>
                <div style={S.menuHead}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{user?.email}</div>
                </div>
                <div style={S.divider} />
                <div style={S.menuLabel}>Set status</div>
                {(['ONLINE', 'BUSY', 'OFFLINE'] as const).map(st => (
                  <button key={st} onClick={() => handleAvailability(st)}
                    style={{ ...S.menuItem, fontWeight: availability === st ? 600 : 400, background: availability === st ? 'var(--surface-3)' : 'transparent' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: availabilityColors[st] }} />
                    {availabilityLabels[st]}
                  </button>
                ))}
                <div style={S.divider} />
                <Link to="/settings/profile" style={S.menuItem} onClick={() => setShowUserMenu(false)}>Profile settings</Link>
                <Link to="/settings/account" style={S.menuItem} onClick={() => setShowUserMenu(false)}>Account settings</Link>
                <div style={S.divider} />
                <button onClick={logout} style={{ ...S.menuItem, color: 'var(--danger)' }}>Log out</button>
              </div>
            )}
          </div>
        </header>

        <main className={isConvFull ? undefined : 'app-main'} style={isConvFull ? S.mainFull : S.main}>
          {children}
        </main>
      </div>

      {/* === Bottom tab bar (mobile only) === */}
      <nav className="app-bottom-tabs">
        {BOTTOM_TABS.map(t => {
          const active = t.path === '__more' ? showMore : location.pathname === t.path;
          if (t.path === '__more') {
            return (
              <button key={t.path} onClick={() => setShowMore(true)} className={active ? 'is-active' : ''} style={S.tabBtn}>
                <NavIcon name={t.icon} /><span>{t.label}</span>
              </button>
            );
          }
          return (
            <Link key={t.path} to={t.path} className={active ? 'is-active' : ''} style={S.tabLink}>
              <NavIcon name={t.icon} /><span>{t.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* === Mobile drawer (full nav) === */}
      {(showMobileNav || showMore) && (
        <div className="app-mobile-drawer" style={S.drawerOverlay} onClick={() => { setShowMobileNav(false); setShowMore(false); }}>
          <div style={S.drawerSheet} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{showMore ? 'More' : 'Menu'}</span>
              <span style={{ flex: 1 }} />
              <button onClick={() => { setShowMobileNav(false); setShowMore(false); }} style={S.iconBtn}><NavIcon name="close" /></button>
            </div>
            <div style={{ padding: 8, overflowY: 'auto', flex: 1 }}>
              {(showMore ? SECONDARY : [...PRIMARY, ...SECONDARY]).map(it => (
                <Link key={it.path} to={it.path}
                  style={{ ...S.drawerItem, ...(location.pathname === it.path ? S.drawerItemActive : {}) }}>
                  <NavIcon name={it.icon} />
                  <span>{it.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NavLink: React.FC<{ item: { path: string; label: string; icon: string }; active: boolean }> = ({ item, active }) => (
  <Link to={item.path} style={{ ...S.navItem, ...(active ? S.navItemActive : {}) }}>
    <NavIcon name={item.icon} />
    <span>{item.label}</span>
  </Link>
);

const UserBlock: React.FC<{ user: any; availability: string }> = ({ user, availability }) => (
  <div style={{ padding: 10, borderTop: '1px solid var(--line)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10 }}>
      <div style={S.avatarWrap}>
        <div style={S.avatar}>{(user?.displayName || user?.name || '?').charAt(0).toUpperCase()}</div>
        <span style={{ ...S.presence, background: availabilityColors[availability] }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.displayName || user?.name}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{availabilityLabels[availability]}</span>
      </div>
    </div>
  </div>
);

function titleFor(p: string): string {
  if (p.startsWith('/dashboard')) return 'Overview';
  if (p.startsWith('/conversations')) return 'Conversations';
  if (p.startsWith('/contacts')) return 'Contacts';
  if (p.startsWith('/inboxes')) return 'Inboxes';
  if (p.startsWith('/broadcasts')) return 'Broadcasts';
  if (p.startsWith('/automations')) return 'Automations';
  if (p.startsWith('/reports')) return 'Reports';
  if (p.startsWith('/labels')) return 'Labels';
  if (p.startsWith('/canned-responses')) return 'Canned Replies';
  if (p.startsWith('/teams')) return 'Teams';
  if (p.startsWith('/csat')) return 'CSAT';
  if (p.startsWith('/whatsapp-templates')) return 'Templates';
  if (p.startsWith('/chatbot')) return 'Chatbot Flows';
  if (p.startsWith('/campaign-analytics')) return 'Analytics';
  if (p.startsWith('/scheduled-messages')) return 'Scheduled';
  if (p.startsWith('/consent')) return 'Consent';
  if (p.startsWith('/settings')) return 'Settings';
  return 'Pulse';
}

const S: Record<string, React.CSSProperties> = {
  shell: { minHeight: '100vh', display: 'flex', background: 'var(--bg)' },
  sidebar: {
    width: 232, flexShrink: 0, background: 'var(--surface)',
    borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
    position: 'sticky', top: 0, height: '100vh',
  },
  brand: { padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 30, height: 30, borderRadius: 9,
    background: 'linear-gradient(135deg, var(--ink) 0%, var(--accent) 130%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 14,
  },
  navList: { padding: '4px 10px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 },
  navHeading: { padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
    color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 500,
  },
  navItemActive: { background: 'var(--surface-3)', color: 'var(--ink)', fontWeight: 600 },

  mainCol: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  header: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '12px 22px', background: 'var(--surface)',
    borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10,
  },
  menuBtn: { display: 'none', background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'var(--ink)' },
  title: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: 'var(--ink)' },
  searchWrap: { flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' },
  userBtn: {
    display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-3)',
    border: 0, borderRadius: 999, padding: '4px 10px 4px 4px', cursor: 'pointer', color: 'var(--ink)',
  },
  avatarWrap: { position: 'relative', width: 30, height: 30 },
  avatar: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2f2bd6, #6a66ff)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
  },
  presence: {
    position: 'absolute', bottom: -1, right: -1, width: 10, height: 10,
    borderRadius: '50%', border: '2px solid var(--surface)',
  },
  userName: { fontSize: 13, fontWeight: 500 },

  userMenu: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 240,
    background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)',
    boxShadow: 'var(--sh-2)', zIndex: 1000, overflow: 'hidden',
  },
  menuHead: { padding: '12px 14px' },
  menuLabel: { padding: '10px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 14px', border: 0, background: 'transparent', cursor: 'pointer',
    fontSize: 13.5, color: 'var(--ink)', textDecoration: 'none', textAlign: 'left',
  },
  divider: { height: 1, background: 'var(--line)' },

  main: { padding: '22px', maxWidth: 1280, margin: '0 auto', width: '100%' },
  mainFull: { flex: 1, overflow: 'hidden' },

  tabBtn: { background: 'transparent', border: 0, cursor: 'pointer' },
  tabLink: { textDecoration: 'none' },
  iconBtn: { background: 'var(--surface-3)', border: 0, borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--ink)' },

  drawerOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(20,22,28,0.45)',
    zIndex: 200, display: 'flex', alignItems: 'flex-end',
  },
  drawerSheet: {
    background: 'var(--surface)', width: '100%', maxHeight: '80vh',
    borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column',
  },
  drawerItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    borderRadius: 8, textDecoration: 'none', color: 'var(--ink)', fontSize: 14, fontWeight: 500,
  },
  drawerItemActive: { background: 'var(--surface-3)', fontWeight: 600 },
};

export default Layout;
