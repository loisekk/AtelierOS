import json
import asyncio
import re
import docker
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from graph import cognitive_app, TaskState

app = FastAPI()

# Initialize Docker Client for Micro-VM Sandboxing
try:
    docker_client = docker.from_env()
    print("✅ Docker SDK initialized for Micro-VM Sandboxing.")
except Exception as e:
    print(f"⚠️ Docker SDK failed to initialize: {e}")
    docker_client = None

# Security patterns that require CEO approval
DANGEROUS_PATTERNS = [r"rm\s+-rf", r"DROP\s+TABLE", r"sudo", r"chmod\s+777", r"DELETE\s+FROM"]

def is_dangerous(command: str) -> bool:
    return any(re.search(p, command, re.IGNORECASE) for p in DANGEROUS_PATTERNS)

def run_in_sandbox(command: str) -> str:
    """Executes a command inside an isolated Docker container (Micro-VM)."""
    if not docker_client:
        return "Error: Docker engine not available."
    try:
        # Run in an isolated Alpine container, auto-remove when done
        output = docker_client.containers.run(
            "alpine", 
            command, 
            remove=True, 
            detach=False, 
            stderr=True, 
            stdout=True
        )
        return output.decode('utf-8').strip()
    except Exception as e:
        # Safely handle container errors using getattr to satisfy strict type checkers
        err_msg = str(e)
        stderr = getattr(e, 'stderr', None)
        if stderr:
            err_msg = stderr.decode('utf-8').strip() if isinstance(stderr, bytes) else str(stderr)
        return f"Execution Error: {err_msg}"

@app.websocket("/ws/cognitive")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ React Client connected to Python Cognitive Engine")
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "dispatch":
                prompt = msg.get("prompt", "Build a system")
                task_id = msg.get("task_id")
                
                initial_state: TaskState = {
                    "task_id": task_id,
                    "prompt": prompt,
                    "sub_tasks": [],
                    "current_index": 0,
                    "context": ""
                }
                
                await websocket.send_text(json.dumps({
                    "type": "cognitive_step",
                    "task_id": task_id,
                    "step": "decompose",
                    "message": f"CEO Brain analyzing prompt: {prompt}"
                }))
                await asyncio.sleep(1)
                
                final_state = cognitive_app.invoke(initial_state)
                
                for sub_task in final_state["sub_tasks"]:
                    # Simulate the AI deciding what command to run based on the sub-task
                    # If the task is QA, let's pretend it wants to run a cleanup script (dangerous)
                    if sub_task["role"] == "QA":
                        proposed_command = "rm -rf /tmp/test_cache"
                    else:
                        proposed_command = f"echo 'Executing {sub_task['task']}' && ls -la /"
                        
                    await websocket.send_text(json.dumps({
                        "type": "cognitive_step",
                        "task_id": task_id,
                        "step": "execute",
                        "sub_task_id": sub_task["id"],
                        "role": sub_task["role"],
                        "message": sub_task["task"],
                        "status": "working"
                    }))

                    # HITL Security Check
                    if is_dangerous(proposed_command):
                        await websocket.send_text(json.dumps({
                            "type": "approval_required",
                            "task_id": task_id,
                            "sub_task_id": sub_task["id"],
                            "command": proposed_command,
                            "message": f"Agent {sub_task['role']} wants to run a restricted command."
                        }))
                        
                        # Block and wait for CEO decision
                        ceo_response = await websocket.receive_text()
                        ceo_msg = json.loads(ceo_response)
                        
                        if ceo_msg.get("type") == "approve_command":
                            await websocket.send_text(json.dumps({
                                "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"], 
                                "log": "✅ CEO Approved. Executing in Micro-VM..."
                            }))
                            # Execute in Docker
                            log_output = await asyncio.to_thread(run_in_sandbox, proposed_command)
                            await websocket.send_text(json.dumps({
                                "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"], 
                                "log": f"$ {proposed_command}\n{log_output}"
                            }))
                        else:
                            await websocket.send_text(json.dumps({
                                "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"], 
                                "log": "🛑 CEO DENIED command. Skipping execution."
                            }))
                    else:
                        # Safe command: Auto-execute in Docker
                        await websocket.send_text(json.dumps({
                            "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"], 
                            "log": "Executing in Micro-VM..."
                        }))
                        log_output = await asyncio.to_thread(run_in_sandbox, proposed_command)
                        await websocket.send_text(json.dumps({
                            "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"], 
                            "log": f"$ {proposed_command}\n{log_output}"
                        }))

                    await asyncio.sleep(1) # Brief pause before marking complete
                    
                    await websocket.send_text(json.dumps({
                        "type": "cognitive_step",
                        "task_id": task_id,
                        "step": "execute",
                        "sub_task_id": sub_task["id"],
                        "role": sub_task["role"],
                        "message": sub_task["task"],
                        "status": "completed"
                    }))
                
                await websocket.send_text(json.dumps({
                    "type": "cognitive_complete",
                    "task_id": task_id,
                    "message": "DAG Execution Complete."
                }))

    except WebSocketDisconnect:
        print("Client disconnected")