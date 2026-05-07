import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { message as antdMessage } from 'antd';
import { getToken, hasToken } from '@/utils/authStorage';

export type WSStatus = 'CONNECTING' | 'OPEN' | 'CLOSED' | 'RECONNECTING' | 'ERROR';

export interface WSEvent {
  id: string;
  type: 'LOG' | 'ALERT' | 'STATS' | 'PROCESS' | 'NOTIFICATION';
  ts: number;
  data: any;
}

type MessageHandler = (event: WSEvent) => void;

interface WebSocketState {
  status: WSStatus;
  events: WSEvent[];
  logs: any[];
  alerts: any[];
  statistics: any | null;
  processInfo: any | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  subscribe: (handler: MessageHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketState>({
  status: 'CLOSED',
  events: [],
  logs: [],
  alerts: [],
  statistics: null,
  processInfo: null,
  connect: () => {},
  disconnect: () => {},
  reconnect: () => {},
  subscribe: () => () => {},
});

export const useWebSocketContext = () => useContext(WebSocketContext);

const WS_URL = () => {
  const host = process.env.NODE_ENV === 'development' ? 'localhost:8080' : window.location.host;
  const protocol = window.location.protocol;
  return `${protocol}//${host}/api/ws`;
};

const MAX_RETRY = 5;
const RETRY_BASE_DELAY = 2000;
const MAX_EVENTS = 50;
const MAX_LOGS = 200;
const MAX_ALERTS = 100;
const ALERT_DEDUP_MS = 5000;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<WSStatus>('CLOSED');
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any | null>(null);
  const [processInfo, setProcessInfo] = useState<any | null>(null);

  const clientRef = useRef<Client | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const tokenRef = useRef<string | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const eventIdsRef = useRef<Set<string>>(new Set());
  const alertNotifRef = useRef<Map<string, number>>(new Map());

  const showAlertNotification = useCallback((alertType: string, text: string) => {
    const now = Date.now();
    const lastShown = alertNotifRef.current.get(alertType) || 0;
    if (now - lastShown < ALERT_DEDUP_MS) return;
    alertNotifRef.current.set(alertType, now);
    antdMessage.warning(text);
  }, []);

  const processEvent = useCallback((event: WSEvent) => {
    if (!mountedRef.current) return;

    if (eventIdsRef.current.has(event.id)) return;
    eventIdsRef.current.add(event.id);
    if (eventIdsRef.current.size > 500) {
      const arr = Array.from(eventIdsRef.current);
      eventIdsRef.current = new Set(arr.slice(-250));
    }

    setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS));

    switch (event.type) {
      case 'LOG': {
        const d = event.data;
        if (d.logs && Array.isArray(d.logs)) {
          setLogs(prev => [...d.logs, ...prev].slice(0, MAX_LOGS));
        } else if (d.log) {
          setLogs(prev => [d.log, ...prev].slice(0, MAX_LOGS));
        }
        break;
      }
      case 'ALERT': {
        const d = event.data;
        if (d.alertLevel) {
          const alert = {
            id: d.id || Date.now(),
            alertLevel: d.alertLevel,
            alertType: d.alertType,
            description: d.description,
            handled: false,
            createdTime: d.createdTime || new Date(event.ts).toISOString(),
            eventId: d.eventId,
            source: d.source,
            computerName: d.computerName,
          };
          setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS));
          showAlertNotification(
            d.alertType || 'UNKNOWN',
            `安全告警: ${alert.description?.slice(0, 50) || alert.alertType}`
          );
        }
        break;
      }
      case 'STATS': {
        setStatistics(event.data);
        break;
      }
      case 'PROCESS': {
        setProcessInfo(event.data);
        break;
      }
      case 'NOTIFICATION': {
        const d = event.data;
        if (d.level === 'ERROR' || d.level === 'WARN') {
          antdMessage.warning(d.message);
        } else {
          antdMessage.info(d.message);
        }
        break;
      }
    }

    handlersRef.current.forEach(h => {
      try { h(event); } catch (e) { console.warn('[WS] handler error:', e); }
    });
  }, [showAlertNotification]);

  const doConnect = useCallback(() => {
    if (clientRef.current?.connected) return;

    const token = getToken();
    if (!token) {
      setStatus('CLOSED');
      return;
    }
    tokenRef.current = token;
    setStatus('CONNECTING');

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL()),
      reconnectDelay: 0,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: () => {},
      onConnect: () => {
        if (!mountedRef.current) return;
        setStatus('OPEN');
        retryCountRef.current = 0;

        client.subscribe('/topic/events', (msg: IMessage) => {
          if (!mountedRef.current) return;
          try {
            const event: WSEvent = JSON.parse(msg.body);
            if (event.id && event.type && event.ts) {
              processEvent(event);
            }
          } catch (e) { console.warn('[WS] parse error:', e); }
        });
      },
      onDisconnect: () => {
        if (!mountedRef.current) return;
        setStatus('CLOSED');
      },
      onWebSocketClose: () => {
        if (!mountedRef.current) return;
        setStatus('CLOSED');
        if (retryCountRef.current < MAX_RETRY) {
          const delay = RETRY_BASE_DELAY * Math.pow(2, retryCountRef.current);
          retryCountRef.current++;
          setStatus('RECONNECTING');
          setTimeout(() => {
            if (mountedRef.current && !clientRef.current?.connected) doConnect();
          }, delay);
        } else {
          setStatus('ERROR');
        }
      },
      onWebSocketError: () => {
        if (!mountedRef.current) return;
        setStatus('ERROR');
      },
      onStompError: (frame) => {
        if (!mountedRef.current) return;
        if (frame.headers?.['message']?.includes('401') || frame.headers?.['message']?.includes('403')) {
          setStatus('ERROR');
          clientRef.current?.deactivate();
          return;
        }
        setStatus('RECONNECTING');
      },
    });

    clientRef.current = client;
    client.activate();
  }, [processEvent]);

  const connect = useCallback(() => {
    retryCountRef.current = 0;
    doConnect();
  }, [doConnect]);

  const disconnect = useCallback(() => {
    retryCountRef.current = MAX_RETRY;
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    setStatus('CLOSED');
  }, []);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    if (clientRef.current) clientRef.current.deactivate();
    setTimeout(doConnect, 500);
  }, [doConnect]);

  const subscribe = useCallback((handler: MessageHandler): (() => void) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth-change') {
        if (!hasToken()) disconnect();
        else connect();
      }
    };
    window.addEventListener('storage', handleStorage);

    if (hasToken()) connect();

    return () => {
      mountedRef.current = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, [connect, disconnect]);

  return (
    <WebSocketContext.Provider value={{
      status, events, logs, alerts, statistics, processInfo,
      connect, disconnect, reconnect, subscribe,
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
