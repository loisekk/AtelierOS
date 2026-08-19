import { useEffect, useRef, useState, useCallback } from 'react';

export interface GatewayMessage {
  type: 'agent_status' | 'terminal_log' | 'cognitive_step' | 'cognitive_complete' | 'approval_required';
  task_id: string; agent_id?: string; status?: string; log?: string;
  step?: string; message?: string; sub_task_id?: string; role?: string; command?: string;
}

const WS_URL = 'ws://127.0.0.1:8000/ws/cognitive';

export const useGateway = (onMessage: (msg: GatewayMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const cbRef = useRef(onMessage);
  useEffect(() => { cbRef.current = onMessage; });   // callback updates WITHOUT touching the socket

  useEffect(() => {
    let disposed = false, retry = 0, ws: WebSocket;
    const connect = () => {
      ws = new WebSocket(WS_URL); wsRef.current = ws;
      ws.onopen = () => { retry = 0; setIsConnected(true); };
      ws.onclose = () => { setIsConnected(false); if (!disposed) setTimeout(connect, Math.min(5000, 1000 * 2 ** retry++)); };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => { try { cbRef.current(JSON.parse(e.data)); } catch (err) { console.error('WS parse error', err); } };
    };
    connect();
    return () => { disposed = true; ws.close(); };
  }, []);

  const sendMessage = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }, []);

  return { isConnected, sendMessage };
};