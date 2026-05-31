import React, { useCallback, useEffect, useRef, useState } from 'react';
import { enablePushNotifications } from '../push';

/**
 * Shows an "Enable notifications" button until the user has granted permission.
 * Required for iOS (installed PWA), where the permission prompt must come from a
 * user tap. Hides itself when push isn't supported or is already granted.
 */
const EnableNotificationsButton: React.FC = () => {
  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied'
  );
  const [busy, setBusy] = useState(false);
  const prevPermission = useRef<NotificationPermission>(permission);

  // Re-read the permission whenever the app regains focus/visibility, so the
  // button reflects changes the user made in browser/OS settings without a
  // reload. If it just became granted, subscribe right away.
  const recheck = useCallback(() => {
    if (!supported) return;
    const current = Notification.permission;
    if (prevPermission.current !== 'granted' && current === 'granted') {
      enablePushNotifications();
    }
    prevPermission.current = current;
    setPermission(current);
  }, [supported]);

  useEffect(() => {
    recheck();
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [recheck]);

  if (!supported || permission === 'granted') return null;

  const denied = permission === 'denied';

  const handleClick = async () => {
    if (denied || busy) return;
    setBusy(true);
    try {
      await enablePushNotifications();
    } finally {
      if ('Notification' in window) setPermission(Notification.permission);
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy || denied}
      title={
        denied
          ? 'Notifications are blocked — enable them in your browser/site settings'
          : 'Get notified about new messages'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: denied ? 'var(--surface-3)' : '#25D366',
        color: denied ? 'var(--ink-3)' : '#fff',
        border: 0,
        borderRadius: 999,
        padding: '6px 12px',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: denied ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 14a3 3 0 0 0-1-2.2V9a5 5 0 1 0-10 0v2.8A3 3 0 0 0 4 14h12z" />
        <path d="M8 17a2 2 0 0 0 4 0" />
      </svg>
      {busy ? 'Enabling…' : denied ? 'Notifications blocked' : 'Enable notifications'}
    </button>
  );
};

export default EnableNotificationsButton;
