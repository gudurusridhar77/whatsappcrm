import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi, NotificationResponse } from '../api/notifications';
import { useNavigate } from 'react-router-dom';

const NOTIFICATION_ICONS: Record<string, string> = {
  conversation_assignment: '\uD83D\uDCE8',
  new_message: '\uD83D\uDCAC',
  mention: '@',
  status_change: '\uD83D\uDD04',
};

const NotificationBell: React.FC = () => {
  const { currentAccountId } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const [nRes, cRes] = await Promise.all([
        notificationsApi.getNotifications(currentAccountId, showUnreadOnly),
        notificationsApi.getUnreadCount(currentAccountId),
      ]);
      setNotifications(nRes.data.content);
      setUnreadCount(cRes.data.count);
    } catch { /* ignore */ }
  }, [currentAccountId, showUnreadOnly]);

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkAsRead = async (notif: NotificationResponse) => {
    if (!currentAccountId || notif.read) return;
    try {
      await notificationsApi.markAsRead(currentAccountId, notif.id);
      loadNotifications();
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    if (!currentAccountId) return;
    try {
      await notificationsApi.markAllAsRead(currentAccountId);
      loadNotifications();
    } catch { /* ignore */ }
  };

  const handleClick = (notif: NotificationResponse) => {
    handleMarkAsRead(notif);
    if (notif.entityType === 'Conversation' && notif.entityId) {
      navigate('/conversations');
    }
    setIsOpen(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  return (
    <div ref={dropdownRef} style={s.wrapper}>
      <button onClick={() => setIsOpen(!isOpen)} style={s.bellBtn}>
        <span style={s.bellIcon}>{'\uD83D\uDD14'}</span>
        {unreadCount > 0 && (
          <span style={s.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={s.dropdown}>
          <div style={s.dropdownHeader}>
            <span style={s.dropdownTitle}>Notifications</span>
            <div style={s.dropdownActions}>
              <button onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                style={{ ...s.filterBtn, ...(showUnreadOnly ? s.filterActive : {}) }}>
                Unread
              </button>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} style={s.markAllBtn}>
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div style={s.notifList}>
            {notifications.length === 0 ? (
              <div style={s.empty}>
                {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id}
                  onClick={() => handleClick(notif)}
                  style={{ ...s.notifItem, ...(notif.read ? {} : s.notifUnread) }}>
                  <span style={s.notifIcon}>
                    {NOTIFICATION_ICONS[notif.notificationType] || '\uD83D\uDD14'}
                  </span>
                  <div style={s.notifContent}>
                    <div style={s.notifTitle}>{notif.title}</div>
                    <div style={s.notifMessage}>{notif.message}</div>
                    <div style={s.notifTime}>{formatTime(notif.createdAt)}</div>
                  </div>
                  {!notif.read && <div style={s.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative' },
  bellBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
    position: 'relative', fontSize: '18px',
  },
  bellIcon: { filter: 'brightness(10)' },
  badge: {
    position: 'absolute', top: '-2px', right: '0', backgroundColor: 'var(--danger)',
    color: 'var(--surface)', fontSize: '10px', fontWeight: 700, borderRadius: '10px',
    padding: '1px 5px', minWidth: '16px', textAlign: 'center',
  },
  dropdown: {
    position: 'absolute', top: '36px', right: '0', width: '360px',
    backgroundColor: 'var(--surface)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 1000, maxHeight: '480px', display: 'flex', flexDirection: 'column',
  },
  dropdownHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid var(--line)',
  },
  dropdownTitle: { fontWeight: 600, fontSize: '15px', color: 'var(--ink)' },
  dropdownActions: { display: 'flex', gap: '6px' },
  filterBtn: {
    padding: '3px 8px', fontSize: '11px', border: '1px solid var(--line)', borderRadius: '4px',
    backgroundColor: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-3)',
  },
  filterActive: { backgroundColor: 'var(--accent)', color: 'var(--surface)', borderColor: 'var(--accent)' },
  markAllBtn: {
    padding: '3px 8px', fontSize: '11px', border: 'none', borderRadius: '4px',
    backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--accent)', fontWeight: 500,
  },
  notifList: { overflowY: 'auto', flex: 1 },
  empty: { textAlign: 'center', color: 'var(--ink-4)', padding: '40px 16px', fontSize: '13px' },
  notifItem: {
    display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 16px',
    borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background 0.1s',
  },
  notifUnread: { backgroundColor: '#eff6ff' },
  notifIcon: { fontSize: '16px', marginTop: '2px', flexShrink: 0 },
  notifContent: { flex: 1, minWidth: 0 },
  notifTitle: { fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' },
  notifMessage: {
    fontSize: '12px', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  notifTime: { fontSize: '11px', color: 'var(--ink-4)', marginTop: '3px' },
  unreadDot: {
    width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)',
    flexShrink: 0, marginTop: '6px',
  },
};

export default NotificationBell;
