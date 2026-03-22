import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';

interface WebSocketEvent {
  event: string;
  data: any;
}

interface UseWebSocketOptions {
  accountId: number | null;
  conversationId?: number | null;
  onConversationUpdate?: (data: any) => void;
  onNewMessage?: (data: any) => void;
  onTyping?: (data: { userName: string; isTyping: boolean }) => void;
  onStatusChange?: (data: { conversationId: number; status: string }) => void;
}

export function useWebSocket({
  accountId,
  conversationId,
  onConversationUpdate,
  onNewMessage,
  onTyping,
  onStatusChange,
}: UseWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accountId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);

        // Subscribe to conversation list updates for this account
        client.subscribe(`/topic/accounts/${accountId}/conversations`, (message) => {
          const event: WebSocketEvent = JSON.parse(message.body);
          if (event.event === 'conversation.updated' && onConversationUpdate) {
            onConversationUpdate(event.data);
          }
          if (event.event === 'conversation.status_changed' && onStatusChange) {
            onStatusChange(event.data);
          }
        });

        // Subscribe to specific conversation messages if viewing one
        if (conversationId) {
          client.subscribe(
            `/topic/accounts/${accountId}/conversations/${conversationId}`,
            (message) => {
              const event: WebSocketEvent = JSON.parse(message.body);
              if (event.event === 'message.created' && onNewMessage) {
                onNewMessage(event.data);
              }
              if (event.event === 'typing' && onTyping) {
                onTyping(event.data);
              }
            }
          );
        }
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error('WebSocket STOMP error:', frame.headers['message']);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [accountId, conversationId, onConversationUpdate, onNewMessage, onTyping, onStatusChange]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (clientRef.current?.connected && accountId && conversationId) {
        clientRef.current.publish({
          destination: `/app/typing/${accountId}/${conversationId}`,
          body: JSON.stringify({ isTyping }),
        });
      }
    },
    [accountId, conversationId]
  );

  return { connected, sendTyping };
}
