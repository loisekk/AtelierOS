import asyncio
import json
import re
from typing import Any, AsyncGenerator, Dict, cast
import docker
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from graph import cognitive_app, TaskState
from router import cost_tracker


# Optional .env loading (python-dotenv) — API keys live in python_engine/.env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

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
            stdout=True,
        )
        return output.decode('utf-8').strip()
    except Exception as e:
        # Safely handle container errors using getattr to satisfy strict type checkers
        err_msg = str(e)
        stderr = getattr(e, 'stderr', None)
        if stderr:
            err_msg = stderr.decode('utf-8').strip() if isinstance(stderr, bytes) else str(stderr)
        return f"Execution Error: {err_msg}"


# ==========================================
# OUTBOX — one sender task per socket.
# All sends are queued; send_text is never called concurrently.
# ==========================================

class Connection:
    def __init__(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        self.outbox: "asyncio.Queue[str]" = asyncio.Queue()
        self.active_tasks = set()  # task_ids dispatched from this socket

    def send(self, payload: Dict[str, Any]) -> None:
        """Queue a frame — fire-and-forget, safe from listener callbacks."""
        self.outbox.put_nowait(json.dumps(payload))

    async def run_sender(self) -> None:
        while True:
            message = await self.outbox.get()
            await self.websocket.send_text(message)


def _event_state(event: Any) -> Dict[str, Any]:
    """Normalize an astream event to the graph state dict.
    Handles stream_mode='updates' ({node: state}) and 'values' (state)."""
    if isinstance(event, dict) and "sub_tasks" not in event:
        for value in event.values():
            if isinstance(value, dict):
                return value
    return event


async def run_task(connection: Connection, task_id: str, prompt: str) -> None:
    """Runs the cognitive graph incrementally (astream) so agents work
    BETWEEN the working/completed frames and cost updates tick live."""
    websocket = connection.websocket
    initial_state: TaskState = {
        "task_id": task_id,
        "prompt": prompt,
        "sub_tasks": [],
        "current_index": 0,
        "context": ""
    }

    connection.send({
        "type": "cognitive_step",
        "task_id": task_id,
        "step": "decompose",
        "message": f"CEO Brain analyzing prompt: {prompt}"
    })
    await asyncio.sleep(1)

    # LangGraph types astream() as a read-only AsyncIterator, but the runtime
    # object is a full AsyncGenerator. Downcast ONCE here — aclose() is then
    # type-safe everywhere below.
    stream = cast(
        AsyncGenerator[Dict[str, Any], None],
        cognitive_app.astream(initial_state, stream_mode="updates"),
    )
    try:
        # First event = decompose node output (the scored DAG)
        state = _event_state(await stream.__anext__())
        sub_tasks = state["sub_tasks"]

        for sub_task in sub_tasks:
            connection.send({
                "type": "cognitive_step",
                "task_id": task_id,
                "step": "execute",
                "sub_task_id": sub_task["id"],
                "role": sub_task["role"],
                "message": sub_task["task"],
                "status": "working"
            })

            # The agent works the step inside the graph NOW —
            # routed LLM, live cost_update frames, memory writes.
            state = _event_state(await stream.__anext__())

            # --- HITL command theater (preserved) ---
            # Simulate the AI deciding what command to run based on the sub-task
            # If the task is QA, let's pretend it wants to run a cleanup script (dangerous)
            if sub_task["role"] == "QA":
                proposed_command = "rm -rf /tmp/test_cache"
            else:
                proposed_command = f"echo 'Executing {sub_task['task']}' && ls -la /"

            if is_dangerous(proposed_command):
                connection.send({
                    "type": "approval_required",
                    "task_id": task_id,
                    "sub_task_id": sub_task["id"],
                    "command": proposed_command,
                    "message": f"Agent {sub_task['role']} wants to run a restricted command."
                })

                # Block and wait for CEO decision
                ceo_response = await websocket.receive_text()
                ceo_msg = json.loads(ceo_response)

                if ceo_msg.get("type") == "approve_command":
                    connection.send({
                        "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"],
                        "log": "✅ CEO Approved. Executing in Micro-VM..."
                    })
                    log_output = await asyncio.to_thread(run_in_sandbox, proposed_command)
                    connection.send({
                        "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"],
                        "log": f"$ {proposed_command}\n{log_output}"
                    })
                else:
                    connection.send({
                        "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"],
                        "log": "🛑 CEO DENIED command. Skipping execution."
                    })
            else:
                # Safe command: Auto-execute in Docker
                connection.send({
                    "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"],
                    "log": "Executing in Micro-VM..."
                })
                log_output = await asyncio.to_thread(run_in_sandbox, proposed_command)
                connection.send({
                    "type": "terminal_log", "task_id": task_id, "agent_id": sub_task["id"],
                    "log": f"$ {proposed_command}\n{log_output}"
                })

            await asyncio.sleep(1)  # Brief pause before marking complete

            connection.send({
                "type": "cognitive_step",
                "task_id": task_id,
                "step": "execute",
                "sub_task_id": sub_task["id"],
                "role": sub_task["role"],
                "message": sub_task["task"],
                "status": "completed",
                # Phase 12 extras (older clients can ignore):
                "model": sub_task.get("model"),
                "model_tier": sub_task.get("model_tier"),
                "cost_usd": sub_task.get("cost_usd"),
                "result": sub_task.get("result")
            })

        connection.send({
            "type": "cognitive_complete",
            "task_id": task_id,
            "message": "DAG Execution Complete."
        })
    finally:
        await stream.aclose()
        connection.active_tasks.discard(task_id)


@app.websocket("/ws/cognitive")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ React Client connected to Python Cognitive Engine")

    connection = Connection(websocket)
    sender_task = asyncio.create_task(connection.run_sender())

    # Phase 12: live cost frames for any task this connection dispatched
    def on_cost(record, task_totals):
        if record.task_id in connection.active_tasks:
            connection.send({
                "type": "cost_update",
                "task_id": record.task_id,
                "data": {**record.to_dict(), "task_totals": task_totals}
            })

    unsubscribe = cost_tracker.subscribe(on_cost)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except (json.JSONDecodeError, ValueError):
                continue  # malformed frame no longer kills the socket

            if msg.get("type") == "dispatch":
                prompt = msg.get("prompt", "Build a system")
                task_id = msg.get("task_id")
                connection.active_tasks.add(task_id)
                try:
                    await run_task(connection, task_id, prompt)
                except Exception as exc:
                    # Engine failure no longer kills the socket
                    connection.send({
                        "type": "cognitive_step",
                        "task_id": task_id,
                        "step": "error",
                        "message": f"Engine error: {exc}"
                    })
                    connection.active_tasks.discard(task_id)

    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        unsubscribe()
        sender_task.cancel()
        try:
            await sender_task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass  # sender already died with the socket — no stray traceback


@app.get("/analytics/costs")
async def analytics_costs():
    """Phase 12: cumulative spend per task (USD), by tier and model."""
    tasks = cost_tracker.all_totals()
    total = sum(task["cost_usd"] for task in tasks.values())
    return {"total_cost_usd": round(total, 6), "tasks": tasks}