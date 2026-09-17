"""
Atelier Cognitive Graph — LangGraph DAG + Memory Matrix + Phase 12 router.

Memory Matrix:
- Redis  — episodic working memory (fast state)
- Qdrant — semantic memory (vector search; MVP dummy 4-D vectors)
- Neo4j  — knowledge graph (entity & dependency mapping)

Phase 12:
- decompose_task (planner) queries semantic memory, decomposes via the LLM
  router when API keys are present (keyword fallback otherwise), and scores
  EVERY sub-task with complexity / model_tier / reasons.
- execute_sub_task routes each step through get_router(task_id).complete()
  and attaches result / model / cost_usd / latency_ms.
- Nodes are async — drive with `await cognitive_app.ainvoke(...)` or
  `cognitive_app.astream(...)` (main.py streams for live updates).
"""

import json
import logging
from typing import TypedDict, List, Dict, Any

from langgraph.graph import StateGraph, END
import redis
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from neo4j import GraphDatabase

from router import ModelTier, classify, get_router, verify_environment

logger = logging.getLogger("atelier.graph")

# ==========================================
# 1. MEMORY MATRIX INITIALIZATION
# ==========================================

# Redis: Episodic Working Memory (Fast state)
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Qdrant: Semantic Memory (Vector embeddings)
qdrant_client = QdrantClient(host='localhost', port=6333)
try:
    qdrant_client.get_collection("atelier_memory")
except Exception:
    qdrant_client.create_collection(
        collection_name="atelier_memory",
        vectors_config=VectorParams(size=4, distance=Distance.COSINE) # Dummy size for MVP
    )

# Neo4j: Graph Memory (Entity & Dependency Mapping)
neo4j_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))


def save_to_graph_memory(task_id: str, sub_task_id: str, role: str, task_name: str,
                         model_tier: str | None = None, model: str | None = None):
    """Saves task completion and relationships to the Neo4j Knowledge Graph."""
    try:
        with neo4j_driver.session() as session:
            session.run(
                """
                MERGE (t:Task {id: $task_id})
                MERGE (st:SubTask {id: $sub_task_id}) 
                SET st.name = $task_name, st.status = 'completed', st.role = $role,
                    st.model_tier = $model_tier, st.model = $model
                MERGE (t)-[:HAS_SUBTASK]->(st)
                MERGE (r:Role {name: $role})
                MERGE (r)-[:EXECUTED]->(st)
                """,
                task_id=task_id, sub_task_id=sub_task_id, task_name=task_name,
                role=role, model_tier=model_tier, model=model
            )
    except Exception as e:
        print(f"Neo4j Error: {e}")

# ==========================================
# 2. COGNITIVE GRAPH STATE & NODES
# ==========================================

class TaskState(TypedDict):
    task_id: str
    prompt: str
    sub_tasks: List[Dict[str, Any]]
    current_index: int
    context: str


PLANNER_ROLES = ["Research", "Engineering", "Frontend", "Backend", "QA", "DevOps"]
CODE_ROLES = {"Engineering", "Backend", "Frontend", "DevOps"}
SECURITY_MARKERS = ("security", "auth", "login", "password", "token", "vulnerability")


def _llm_available() -> bool:
    return not verify_environment()


def _plan_with_keywords(prompt: str) -> List[Dict[str, Any]]:
    """Built-in decomposition — preserved exactly (zero-dependency fallback)."""
    lowered = prompt.lower()
    if "auth" in lowered or "login" in lowered:
        return [
            {"id": "backend_1", "role": "Backend", "task": "Build Database Schema & API Endpoints", "status": "pending"},
            {"id": "frontend_1", "role": "Frontend", "task": "Build Login UI Component", "status": "pending", "depends_on": "backend_1"},
            {"id": "qa_1", "role": "QA", "task": "Write Security Tests", "status": "pending", "depends_on": "frontend_1"}
        ]
    return [
        {"id": "research_1", "role": "Research", "task": f"Analyze requirements for: {prompt}", "status": "pending"},
        {"id": "dev_1", "role": "Engineering", "task": "Implement core logic", "status": "pending", "depends_on": "research_1"},
        {"id": "qa_1", "role": "QA", "task": "Run test suite", "status": "pending", "depends_on": "dev_1"}
    ]


def _parse_plan(raw: str) -> List[Dict[str, Any]] | None:
    """Best-effort JSON extraction from the planner LLM's reply."""
    try:
        start, end = raw.find("["), raw.rfind("]")
        if start == -1 or end <= start:
            return None
        items = json.loads(raw[start:end + 1])
    except Exception:
        return None
    if not isinstance(items, list) or not items:
        return None
    sub_tasks: List[Dict[str, Any]] = []
    for position, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        task = item.get("task")
        if not isinstance(task, str) or not task.strip():
            continue
        role = item.get("role") if item.get("role") in PLANNER_ROLES else "Engineering"
        depends_on = item.get("depends_on")
        sub_tasks.append({
            "id": str(item.get("id") or f"step_{position}"),
            "role": role,
            "task": task.strip(),
            "status": "pending",
            "depends_on": depends_on if isinstance(depends_on, str) else None,
        })
    return sub_tasks or None


async def _plan_with_llm(task_id: str, prompt: str, context: str) -> List[Dict[str, Any]] | None:
    """LLM decomposition through the router (SMART tier). None = use fallback."""
    if not _llm_available():
        return None
    system = (
        "You are the CEO Brain of Atelier, an AI company. Decompose the CEO's task "
        "into 2 to 5 sequential sub-tasks for your AI employees. Reply with ONLY a "
        'JSON array, no prose: [{"id": "step_1", "role": "<one of: '
        + ", ".join(PLANNER_ROLES) + '>", "task": "<one-sentence instruction>", '
        '"depends_on": <previous step id or null>}]'
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"CEO task: {prompt}\n\nPrior context from semantic memory: {context}"},
    ]
    try:
        result = await get_router(task_id).complete(
            messages, step_id="planner", tier=ModelTier.SMART,
            temperature=0.2, max_tokens=800,
        )
    except Exception as exc:
        logger.warning("LLM planner failed (%s) — using keyword decomposition", exc)
        return None
    return _parse_plan(result["content"])


async def decompose_task(state: TaskState):
    """The CEO Brain decomposes the prompt, querying Semantic Memory (Qdrant) first."""
    prompt = state["prompt"]

    # 1. Query Semantic Memory (Mock vector for MVP)
    try:
        # Updated to use query_points (search is deprecated in newer qdrant-client versions)
        search_response = qdrant_client.query_points(
            collection_name="atelier_memory",
            query=[0.1, 0.2, 0.3, 0.4], # In production, this would be an embedding of the prompt
            limit=1
        )
        if search_response.points:
            # Added explicit None check for payload to satisfy strict type checkers
            payload = search_response.points[0].payload
            if payload is not None:
                context = payload.get("context", "No prior context found.")
            else:
                context = "No prior context found."
        else:
            context = "No prior context found."
    except Exception:
        context = "Semantic memory offline."

    state["context"] = context

    # 2. Decompose: LLM planner when the router is usable, built-in fallback otherwise
    sub_tasks = await _plan_with_llm(state["task_id"], prompt, context)
    if sub_tasks is None:
        sub_tasks = _plan_with_keywords(prompt)

    # 3. Planner scoring (Phase 12): every step gets complexity / model_tier / reasons
    for index, sub_task in enumerate(sub_tasks):
        lowered = sub_task["task"].lower()
        sub_task.update(classify(
            sub_task["task"],
            dag_depth=index,
            dependencies=1 if sub_task.get("depends_on") else 0,
            has_code=sub_task.get("role") in CODE_ROLES,
            security_sensitive=any(marker in lowered for marker in SECURITY_MARKERS),
        ))

    state["sub_tasks"] = sub_tasks
    state["current_index"] = 0
    return state


async def _work_sub_task(state: TaskState, sub_task: Dict[str, Any]) -> None:
    """The agent works its sub-task through the routed LLM."""
    task_id = state["task_id"]
    system = (
        f"You are the {sub_task['role']} agent at Atelier, an AI company. "
        "Do your part of the CEO's task. Be concise and concrete."
    )
    user = (
        f"CEO's task: {state['prompt']}\n"
        f"Your assignment: {sub_task['task']}\n"
        f"Context from memory: {state['context']}"
    )
    try:
        result = await get_router(task_id).complete(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            step_id=sub_task["id"],
            tier=sub_task.get("model_tier", "smart"),
        )
        sub_task["result"] = result["content"]
        sub_task["model"] = result["model"]
        sub_task["model_tier"] = result["tier"]
        sub_task["cost_usd"] = result["cost_usd"]
        sub_task["latency_ms"] = result["latency_ms"]
    except Exception as exc:
        # Zero-key / offline mode: keep the DAG alive with a simulated result.
        logger.warning("[%s/%s] router failed (%s) — simulated result", task_id, sub_task["id"], exc)
        sub_task["result"] = f"[router offline] Simulated completion of: {sub_task['task']}"
        sub_task["model"] = "simulated"


async def execute_sub_task(state: TaskState):
    """Executes sub-task, saves state to Episodic Memory (Redis) and Graph Memory (Neo4j)."""
    idx = state["current_index"]
    if idx < len(state["sub_tasks"]):
        sub_task = state["sub_tasks"][idx]

        # 1. The agent works the step (routed LLM — Phase 12)
        await _work_sub_task(state, sub_task)

        # 2. Mark completed (preserved)
        sub_task["status"] = "completed"

        # 3. Save Episodic State to Redis (Fast retrieval for other agents)
        redis_client.set(f"task:{state['task_id']}:state", json.dumps(state))

        # 4. Save to Neo4j Knowledge Graph (Dependency tracking)
        save_to_graph_memory(
            state["task_id"], sub_task["id"], sub_task["role"], sub_task["task"],
            model_tier=sub_task.get("model_tier"), model=sub_task.get("model"),
        )

        state["current_index"] += 1
    return state


def should_continue(state: TaskState):
    """Routing condition to continue the graph or end."""
    if state["current_index"] < len(state["sub_tasks"]):
        return "execute"
    return END

# ==========================================
# 3. BUILD THE GRAPH
# ==========================================

workflow = StateGraph(TaskState)
workflow.add_node("decompose", decompose_task)
workflow.add_node("execute", execute_sub_task)

workflow.set_entry_point("decompose")
workflow.add_conditional_edges(
    "decompose",
    should_continue,
    {
        "execute": "execute",
        END: END
    }
)
workflow.add_conditional_edges(
    "execute",
    should_continue,
    {
        "execute": "execute",
        END: END
    }
)

# Compile the cognitive graph (nodes are async — use ainvoke / astream)
cognitive_app = workflow.compile()