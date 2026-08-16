export interface ClientMessage {
  type: 'dispatch';
  task_id: string;
  assignee_ids: string[];
  prompt: string;
}

export interface ServerMessage {
  type: 'agent_status' | 'terminal_log';
  task_id: string;
  agent_id: string;
  status?: string;
  log?: string;
}