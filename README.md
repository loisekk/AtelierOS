# 🏛️ Atelier AI Company OS

**A 3D Visual Operating System for Autonomous AI Teams.**

Atelier is not a dashboard; it is a 3D spatial diorama of a premium AI company headquarters. The user acts as the CEO, dispatching high-level tasks (via text or voice) to a 3D CEO Brain Core. A Python backend decomposes the task into a Directed Acyclic Graph (DAG) and routes the steps to human-like 3D AI employees. These employees physically sit at their desks, type on dynamic monitors that stream real terminal logs, walk between rooms using pathfinding, and execute real code inside isolated Docker Micro-VMs.

![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=three.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-Stateful_DAGs-green?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Micro--VMs-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## ✨ Core Features

*   🧠 **Cognitive Engine (LangGraph):** High-level prompts are decomposed into stateful, multi-actor DAGs with self-healing topologies.
*   🏢 **Cinematic 3D HQ:** A custom GLB architectural model rendered with warm PBR materials, dynamic lighting, and ACES Filmic tone mapping.
*   🧑‍💻 **Living AI Employees:** Agents physically walk to the Meeting Room, sit at auto-detected GLB workstations, and collaborate in holographic bubbles.
*   🛡️ **Micro-VM Security (HITL):** Autonomous agents cannot run terminal commands directly on the host. The Python backend spins up isolated Alpine Docker containers. Dangerous commands (`rm -rf`, `DROP TABLE`) trigger a **Human-in-the-Loop** modal requiring CEO approval.
*   🖥️ **Dynamic Canvas Textures:** Agent desk monitors and the Meeting Room wall screen stream real-time terminal logs, status updates, and live DAG visualizations.
*   🗺️ **Spatial Calibration System:** Built-in developer tools allow you to load any custom 3D office model and click-to-map waypoints, automatically generating coordinate configurations.
*   🎙️ **Voice Command Interface:** Dispatch tasks to your AI team using the browser's Web Speech API.

---

## 🏗️ Architecture & Tech Stack

### Frontend (The 3D Visual OS)
*   **Core:** React 19 + TypeScript + Vite + Tailwind CSS
*   **3D Engine:** Vanilla Three.js (Custom `AtelierEngine.ts` class for direct WebGL/scene graph control, bypassing React Three Fiber overhead).
*   **UI Theme:** Light, premium warm architectural theme (Cream `#F1E7D8`, Terracotta `#B96D3D`).

### Backend (The Cognitive Engine)
*   **API & I/O:** FastAPI + WebSockets (`ws://127.0.0.1:8000/ws/cognitive`).
*   **Orchestration:** Python + LangGraph.
*   **Memory Matrix:** 
    *   *Redis:* Episodic working memory (fast state sharing).
    *   *Qdrant:* Semantic vector memory (codebase embeddings).
    *   *Neo4j:* Knowledge graph (entity & dependency mapping).
*   **Sandbox:** Docker SDK for Python (Alpine Micro-VMs).

---

## 📂 Project Structure

The frontend utilizes a **Feature-Based Architecture** for scalability:

```text
client/atelier-planner/src/
├── app/
│   └── App.tsx                 # Main orchestrator, state management, HITL modals
├── features/
│   ├── canvas/                 # The 3D Engine
│   │   ├── engine/             # AtelierEngine.ts, Navigation.ts, ScreenManager.ts, AgentController.ts
│   │   └── architecture/       # BuildingLoader.ts, MaterialTheme.ts, SpatialConfig.ts, RoomScanner.ts
│   ├── workspace/              # The AI Company Logic & UI
│   │   ├── components/         # TopBar, LeftPanel, RightPanel, Modals
│   │   └── hooks/              # useAtelier.ts, useGateway.ts, useVoice.ts
│   ├── furniture/              # 3D Catalog (catalog.ts, templates.ts, factories/avatars.ts)
│   └── ai-agents/              # types.ts (AgentStatus, Task, DAG Steps)
└── styles/
    └── index.css               # Tailwind & global CSS variables
```

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v18+) or **Bun**
*   **Python** (3.10+)
*   **Docker Desktop** (Running and accessible via CLI)
*   **Memory Stack:** Redis, Neo4j, and Qdrant (can be run via Docker Compose or locally).

### 1. Frontend Setup
```bash
cd client/atelier-planner
npm install
npm run dev
```
*The app will be available at `http://localhost:5173`.*

### 2. Backend Setup
```bash
cd python_engine
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*The WebSocket server will listen on `ws://127.0.0.1:8000/ws/cognitive`.*

---

## 🛠️ Developer Tools & Calibration

Atelier includes powerful in-browser debugging tools for mapping custom 3D environments. Expose the engine to the console by adding `window.atelierEngine = engineRef.current;` in `App.tsx`.

### 📍 Spatial Calibration Tool
If you swap the `agent-build-v1.glb` model for a new office layout, the hardcoded waypoints will break. Use the calibration tool to remap them:
1. Open the browser console (`F12`).
2. Run: `window.atelierEngine.startCalibration()`
3. Click the floor of each prompted room in the 3D viewport.
4. The tool will emit a perfectly formatted `WAYPOINTS` block. Paste this directly into `src/features/canvas/architecture/SpatialConfig.ts`.

### 🗺️ Room Zone Debugging
To visualize the invisible bounding boxes used for room-specific furniture placement:
```javascript
window.atelierEngine.debugRooms()
```

---

## 🗺️ Roadmap

### ✅ Completed (Phases 0 - 12)
*   Core AI OS, LangGraph DAG decomposition, Docker Micro-VMs, HITL Security.
*   Procedural & GLB Building Loaders with Meshopt compression.
*   V2 PBR Material Theme (Name-based + Bounding Box Heuristics).
*   Workstation Registry (Auto-assigning agents to GLB desks).
*   Room Zoning, Spatial Calibration, and Floor-Height Syncing.
*   RoomFurnisher for automated room-based furniture placement.
*   Dynamic canvas textures and real-time DAG visualization.

### 🚧 Up Next
*   **Phase 13: Real CLI Adapters:** Replace mock sandbox commands with actual `Bun.spawn(['opencode', 'run', prompt])` or `claude` CLI calls to execute real-world coding tasks.
*   **Phase 14: Navmesh Pathfinding:** Migrate from BFS waypoint graphs to `@recast-navigation/three` for true obstacle-avoiding crowd simulation.

---

## 📄 License
This project is proprietary and built for the Atelier AI ecosystem.