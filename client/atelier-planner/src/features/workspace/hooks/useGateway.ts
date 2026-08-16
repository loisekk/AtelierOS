import { useEffect, useRef, useState, useCallback } from 'react';

export interface GatewayMessage {
  type: 'agent_status' | 'terminal_log' | 'cognitive_step' | 'cognitive_complete' | 'approval_required';
  task_id: string;
  agent_id?: string;
  status?: string;
  log?: string;
  // Python DAG specific
  step?: string;
  message?: string;
  sub_task_id?: string;
  role?: string;
  // HITL specific
  command?: string;
}

export const useGateway = (onMessage: (msg: GatewayMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to Python FastAPI Cognitive Engine
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/cognitive');
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GatewayMessage;
        onMessage(data);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    return () => ws.close();
  }, [onMessage]);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, sendMessage };
};