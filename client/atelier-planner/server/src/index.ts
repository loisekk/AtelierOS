import { runAgent } from './mockAgent';
import type { ClientMessage, ServerMessage } from './types';

const PORT = 8787;

Bun.serve({
  port: PORT,
  websocket: {
    open(ws) {
      console.log("✅ React Client connected to Gateway");
    },
    async message(ws, message) {
      const text = message.toString();
      let parsed: ClientMessage;
      
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        return; // Ignore invalid JSON
      }

      if (parsed.type === 'dispatch') {
        console.log(`Received task: ${parsed.prompt}`);
        
        // Spawn a background task for each assigned agent
        for (const agentId of parsed.assignee_ids) {
          // We pass a callback that sends messages back through the WebSocket
          runAgent(parsed.task_id, agentId, parsed.prompt, (msg: ServerMessage) => {
            ws.send(JSON.stringify(msg));
          });
        }
      }
    },
    close(ws) {
      console.log("Client disconnected");
    }
  },
  fetch(req, server) {
    // Upgrade HTTP request to WebSocket
    if (req.headers.get("upgrade") === "websocket") {
      server.upgrade(req);
      return;
    }
    return new Response("Atelier Gateway Running", { status: 200 });
  }
});

console.log(`🚀 Bun Atelier Gateway running on http://127.0.0.1:${PORT}`);