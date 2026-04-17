import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws';

export const useWebSocket = (onMessage) => {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(true);

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        if (isMounted.current) setConnected(true);
        console.log('🔌 WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (isMounted.current && onMessage) onMessage(data);
        } catch (e) {}
      };

      ws.current.onclose = () => {
        if (isMounted.current) {
          setConnected(false);
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.current.onerror = () => {
        ws.current?.close();
      };
    } catch (e) {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [onMessage]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { connected };
};
