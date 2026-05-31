import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';

/**
 * Subscribes to the current user's notification topic and fires `onNotification`
 * whenever the backend pushes one — so the bell badge updates in real time
 * instead of waiting for the 30s poll.
 */
export function useNotificationsSocket(
  userId: number | null | undefined,
  onNotification: () => void
) {
  // Keep the latest callback without re-running the effect (avoids reconnects).
  const cbRef = useRef(onNotification);
  cbRef.current = onNotification;

  useEffect(() => {
    if (!userId) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        client.subscribe(`/topic/users/${userId}/notifications`, () => {
          cbRef.current();
        });
      },
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [userId]);
}
