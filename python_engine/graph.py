import json
import uuid
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
import redis
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from neo4j import GraphDatabase

# ==========================================
# 1. MEMORY MATRIX INITIALIZATION
# ==========================================

# Redis: Episodic Working Memory (Fast state)
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Qdrant: Semantic Memory (Vector embeddings)
qdrant_client = QdrantClient(host='localhost', port=6333)
try:
    qdrant_client.get_collection("atelier_memory")
except:
    qdrant_client.create_collection(
        collection_name="atelier_memory",
        vectors_config=VectorParams(size=4, distance=Distance.COSINE) # Dummy size for MVP
    )

# Neo4j: Graph Memory (Entity & Dependency Mapping)
neo4j_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))

def save_to_graph_memory(task_id: str, sub_task_id: str, role: str, task_name: str):
    """Saves task completion and relationships to the Neo4j Knowledge Graph."""
    try:
        with neo4j_driver.session() as session:
            session.run(
                """
                MERGE (t:Task {id: $task_id})
                MERGE (st:SubTask {id: $sub_task_id}) 
                SET st.name = $task_name, st.status = 'completed', st.role = $role
                MERGE (t)-[:HAS_SUBTASK]->(st)
                MERGE (r:Role {name: $role})
                MERGE (r)-[:EXECUTED]->(st)
                """,
                task_id=task_id, sub_task_id=sub_task_id, task_name=task_name, role=role
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

def decompose_task(state: TaskState):
    """The CEO Brain decomposes the prompt, querying Semantic Memory (Qdrant) first."""
    prompt = state["prompt"].lower()
    
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
    
    # 2. Decompose task based on prompt
    if "auth" in prompt or "login" in prompt:
        state["sub_tasks"] = [
            {"id": "backend_1", "role": "Backend", "task": "Build Database Schema & API Endpoints", "status": "pending"},
            {"id": "frontend_1", "role": "Frontend", "task": "Build Login UI Component", "status": "pending", "depends_on": "backend_1"},
            {"id": "qa_1", "role": "QA", "task": "Write Security Tests", "status": "pending", "depends_on": "frontend_1"}
        ]
    else:
        state["sub_tasks"] = [
            {"id": "research_1", "role": "Research", "task": f"Analyze requirements for: {state['prompt']}", "status": "pending"},
            {"id": "dev_1", "role": "Engineering", "task": "Implement core logic", "status": "pending", "depends_on": "research_1"},
            {"id": "qa_1", "role": "QA", "task": "Run test suite", "status": "pending", "depends_on": "dev_1"}
        ]
        
    state["current_index"] = 0
    return state

def execute_sub_task(state: TaskState):
    """Executes sub-task, saves state to Episodic Memory (Redis) and Graph Memory (Neo4j)."""
    idx = state["current_index"]
    if idx < len(state["sub_tasks"]):
        sub_task = state["sub_tasks"][idx]
        sub_task["status"] = "completed"
        
        # 1. Save Episodic State to Redis (Fast retrieval for other agents)
        redis_client.set(f"task:{state['task_id']}:state", json.dumps(state))
        
        # 2. Save to Neo4j Knowledge Graph (Dependency tracking)
        save_to_graph_memory(state["task_id"], sub_task["id"], sub_task["role"], sub_task["task"])
        
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

# Compile the cognitive graph
cognitive_app = workflow.compile()