import type { ServerMessage } from './types';

export async function runAgent(
  taskId: string, 
  agentId: string, 
  prompt: string, 
  send: (msg: ServerMessage) => void
) {
  const log = (message: string) => send({
    type: 'terminal_log',
    task_id: taskId,
    agent_id: agentId,
    log: message
  });

  const setStatus = (status: string) => send({
    type: 'agent_status',
    task_id: taskId,
    agent_id: agentId,
    status: status
  });

  // Helper function to run real shell commands and stream output
  const runCmd = async (cmd: string[]) => {
    log(`$ ${cmd.join(' ')}`);
    const proc = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: process.cwd() // Runs in the current directory
    });

    // Read output line by line
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) log(`  ${line}`);
      }
    }
    if (buffer.trim()) log(`  ${buffer}`);
    
    await proc.exited; // Wait for process to finish
  };

  // 1. Start Working
  setStatus('working');
  log(`Agent ${agentId} received task: ${prompt}`);
  
  // 2. Real Execution Phase
  await Bun.sleep(500);
  log('> Initializing real workspace...');
  
  // Real Command 1: Create a file
  await runCmd(['cmd', '/c', 'echo', 'This is a real file created by Atelier Agent!', '>', `task_${taskId}.txt`]);
  
  // Real Command 2: Read the directory
  await runCmd(['cmd', '/c', 'dir', 'task_*.txt']);
  
  // Real Command 3: Run Git Status (if in a git repo)
  await runCmd(['git', 'status']);

  // 3. Complete
  log('✅ Real execution completed successfully.');
  setStatus('idle');
}