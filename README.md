<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=240&color=0:F1E7D8,100:B96D3D&text=ATELIER&fontSize=76&fontColor=3B2A1E&fontAlignY=38&desc=A%203D%20Visual%20Operating%20System%20for%20Autonomous%20AI%20Teams&descSize=18&descAlignY=60&animation=fadeIn" alt="Atelier banner" width="100%" />

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=500&size=20&duration=3200&pause=900&color=B96D3D&center=true&vCenter=true&width=760&lines=You+are+the+CEO.;Dispatch+a+task+by+text+or+voice.;A+DAG+of+AI+employees+gets+to+work.;They+walk.+They+type.+They+ship+code.;Every+risky+command+waits+for+your+approval." alt="Typing animation" />
</a>

<br/>

![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
<br/>
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-Stateful_DAGs-2E7D32?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Micro--VMs-2496ED?style=for-the-badge&logo=docker&logoColor=white)
<br/>
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-DC244C?style=for-the-badge)
![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-B96D3D?style=for-the-badge)

<br/>

**[Overview](#-overview) · [Features](#-core-features) · [Architecture](#-architecture) · [Security](#-security-model) · [Quick Start](#-quick-start) · [Structure](#-project-structure) · [Roadmap](#-roadmap)**

</div>

<br/>

<!--
  DEMO SLOT: record a 10-15s screen capture (CEO dispatches a task -> agents walk -> monitors stream logs)
  and drop it at docs/media/demo.gif, then uncomment below.

<p align="center">
  <img src="docs/media/demo.gif" alt="Atelier demo" width="90%" />
</p>
-->

## 🏛️ Overview

Atelier is **not a dashboard**. It is a spatial diorama of a premium AI company headquarters where you act as the CEO.

Give a high-level task to the **CEO Brain Core** in 3D, by keyboard or voice. A Python backend decomposes it into a **Directed Acyclic Graph (DAG)** and routes each step to a human-like 3D AI employee. Employees sit at their desks, type on monitors that stream **real terminal logs**, walk between rooms using pathfinding, and execute code inside **isolated Docker micro-VMs**.

> Watching your agents work should feel like walking through an office, not reading a log file.

<br/>

## ⚡ The Loop

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F1E7D8','primaryTextColor':'#3B2A1E','primaryBorderColor':'#B96D3D','lineColor':'#B96D3D','secondaryColor':'#FBF6EE','tertiaryColor':'#FBF6EE'}}}%%
flowchart LR
    A([🎙️ CEO<br/>text or voice]) --> B{{🧠 CEO Brain Core}}
    B -->|LangGraph| C[/DAG Decomposition/]
    C --> D1[🧑‍💻 Agent A]
    C --> D2[🧑‍💻 Agent B]
    C --> D3[🧑‍💻 Agent C]
    D1 & D2 & D3 --> E[🐳 Alpine Micro-VM]
    E -->|dangerous command| F{{🛡️ HITL Approval}}
    F -->|approved| E
    E -->|logs stream| G[🖥️ Desk Monitors<br/>+ Wall Screen]
```

<br/>

## ✨ Core Features

| | Feature | What it does |
|---|---|---|
| 🧠 | **Cognitive Engine** | LangGraph decomposes prompts into stateful, multi-actor DAGs with self-healing topologies. |
| 🏢 | **Cinematic 3D HQ** | Custom GLB architecture with warm PBR materials, dynamic lighting and ACES Filmic tone mapping. |
| 🧑‍💻 | **Living AI Employees** | Agents walk to the Meeting Room, sit at auto-detected GLB workstations and collaborate in holographic bubbles. |
| 🛡️ | **Micro-VM Security (HITL)** | No direct host access. Commands run in isolated Alpine containers; destructive ones need CEO approval. |
| 🖥️ | **Dynamic Canvas Textures** | Desk monitors and the Meeting Room wall stream terminal logs, status and live DAG visualizations. |
| 🗺️ | **Spatial Calibration** | Load any custom 3D office model, click to map waypoints, and get generated coordinate configs. |
| 🎙️ | **Voice Command Interface** | Dispatch tasks through the browser's Web Speech API. |

<br/>

## 🎬 See It In Action

<div align="center">

### 🧭 2D Plan View
<img src="assets/2d-atelier-os.png" alt="Atelier OS 2D view" width="92%" />
<br/><sub>Top-down layout of the HQ: rooms, zones and workstations at a glance.</sub>

<br/><br/>

### 🏢 3D Cinematic View
<img src="assets/3d-model-atelierOS.png" alt="Atelier OS 3D model view" width="92%" />
<br/><sub>The live 3D diorama: PBR materials, lighting and AI employees at their desks.</sub>

</div>

<br/>

## 🏗️ Architecture

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F1E7D8','primaryTextColor':'#3B2A1E','primaryBorderColor':'#B96D3D','lineColor':'#B96D3D'}}}%%
flowchart TB
    subgraph FE["Frontend · The 3D Visual OS"]
        direction TB
        UI["React 19 + Tailwind<br/>panels, modals, HITL"]
        ENG["AtelierEngine.ts<br/>vanilla Three.js"]
        UI <--> ENG
    end

    subgraph BE["Backend · The Cognitive Engine"]
        direction TB
        API["FastAPI + WebSocket"]
        LG["LangGraph<br/>orchestration"]
        SB["Docker SDK<br/>Alpine sandbox"]
        API --> LG --> SB
    end

    subgraph MEM["Memory Matrix"]
        direction LR
        R[("Redis<br/>episodic")]
        Q[("Qdrant<br/>semantic")]
        N[("Neo4j<br/>knowledge graph")]
    end

    FE <-->|"ws://127.0.0.1:8000/ws/cognitive"| API
    LG <--> MEM
```

### Frontend

| Layer | Choice | Notes |
|---|---|---|
| Core | React 19, TypeScript, Vite, Tailwind CSS | Feature-based architecture |
| 3D | Vanilla Three.js via a custom `AtelierEngine.ts` | Direct WebGL and scene-graph control, no React Three Fiber overhead |
| Theme | Light, warm architectural | Cream `#F1E7D8`, Terracotta `#B96D3D` |

### Backend

| Layer | Choice | Notes |
|---|---|---|
| API and I/O | FastAPI + WebSockets | `ws://127.0.0.1:8000/ws/cognitive` |
| Orchestration | Python + LangGraph | Stateful DAG execution |
| Memory | Redis, Qdrant, Neo4j | Episodic working memory, codebase embeddings, entity and dependency graph |
| Sandbox | Docker SDK for Python | Alpine micro-VMs |

<br/>

## 🛡️ Security Model

Autonomous agents never touch the host shell. Every command is routed through the backend into a disposable container, and anything destructive pauses for a human decision.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F1E7D8','primaryTextColor':'#3B2A1E','primaryBorderColor':'#B96D3D','lineColor':'#B96D3D','actorBkg':'#F1E7D8','actorBorder':'#B96D3D','signalColor':'#B96D3D'}}}%%
sequenceDiagram
    autonumber
    participant Agent as 🧑‍💻 Agent
    participant Engine as ⚙️ Python Engine
    participant CEO as 👤 CEO (UI Modal)
    participant VM as 🐳 Alpine Micro-VM

    Agent->>Engine: request command
    Engine->>Engine: classify risk
    alt safe command
        Engine->>VM: execute
        VM-->>Agent: stream logs
    else dangerous (rm -rf, DROP TABLE)
        Engine->>CEO: HITL approval request
        alt approved
            CEO-->>Engine: allow
            Engine->>VM: execute
            VM-->>Agent: stream logs
        else denied
            CEO-->>Engine: deny
            Engine-->>Agent: blocked
        end
    end
```

<br/>

## 🚀 Quick Start

### Prerequisites

| Requirement | Version / Note |
|---|---|
| Node.js or Bun | Node v18+ |
| Python | 3.10+ |
| Docker Desktop | Running and accessible via CLI |
| Memory stack | Redis, Neo4j and Qdrant (Docker Compose or local) |

### 1 · Frontend

```bash
cd client/atelier-planner
npm install
npm run dev
```

Open **http://localhost:5173**

### 2 · Backend

```bash
cd python_engine
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The WebSocket server listens on **ws://127.0.0.1:8000/ws/cognitive**.

### 3 · Dispatch your first task

1. Confirm the frontend connects to the gateway (check the top bar).
2. Click the CEO Brain Core, or use the mic, and describe a goal.
3. Watch the DAG appear on the Meeting Room wall, then follow agents to their desks.
4. Approve or deny any HITL prompts that appear.

<br/>

## 📂 Project Structure

The frontend follows a **feature-based architecture** so each domain scales independently.

```text
client/atelier-planner/src/
├── app/
│   └── App.tsx                 # Orchestrator, state management, HITL modals
├── features/
│   ├── canvas/                 # 🎬 The 3D engine
│   │   ├── engine/             #    AtelierEngine, Navigation, ScreenManager, AgentController
│   │   └── architecture/       #    BuildingLoader, MaterialTheme, SpatialConfig, RoomScanner
│   ├── workspace/              # 🏢 AI company logic and UI
│   │   ├── components/         #    TopBar, LeftPanel, RightPanel, Modals
│   │   └── hooks/              #    useAtelier, useGateway, useVoice
│   ├── furniture/              # 🪑 3D catalog (catalog, templates, factories/avatars)
│   └── ai-agents/              # 🤖 Types: AgentStatus, Task, DAG steps
└── styles/
    └── index.css               # Tailwind and global CSS variables
```

<details>
<summary><b>🔎 Engine module responsibilities</b></summary>

<br/>

| Module | Responsibility |
|---|---|
| `AtelierEngine.ts` | Scene graph, render loop, lighting, tone mapping |
| `Navigation.ts` | Waypoint graph and BFS pathfinding |
| `ScreenManager.ts` | Canvas textures for monitors and wall screens |
| `AgentController.ts` | Agent movement, seating and state animation |
| `BuildingLoader.ts` | Procedural and GLB building loading (Meshopt) |
| `MaterialTheme.ts` | V2 PBR materials via name-based and bounding-box heuristics |
| `SpatialConfig.ts` | Room zoning and coordinate configuration |
| `RoomScanner.ts` | Workstation detection and spatial calibration |

</details>

<br/>

## 🗺️ Roadmap

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F1E7D8','primaryTextColor':'#3B2A1E','primaryBorderColor':'#B96D3D','lineColor':'#B96D3D'}}}%%
timeline
    title Atelier Roadmap
    Phases 0 to 12 (Shipped) : Core AI OS and LangGraph DAGs
                             : Docker micro-VMs and HITL
                             : GLB loaders, PBR theme, workstation registry
                             : Room zoning, calibration, RoomFurnisher
                             : Dynamic canvas textures
    Phase 13 (Next)          : Real CLI adapters
    Phase 14 (Next)          : Navmesh pathfinding
```

### ✅ Shipped (Phases 0–12)

- [x] Core AI OS, LangGraph DAG decomposition, Docker micro-VMs, HITL security
- [x] Procedural and GLB building loaders with Meshopt compression
- [x] V2 PBR material theme (name-based and bounding-box heuristics)
- [x] Workstation registry that auto-assigns agents to GLB desks
- [x] Room zoning, spatial calibration and floor-height syncing
- [x] RoomFurnisher for automated room-based furniture placement
- [x] Dynamic canvas textures and real-time DAG visualization

### 🚧 Up Next

- [ ] **Phase 13 · Real CLI adapters:** replace mock sandbox commands with actual `Bun.spawn(['opencode', 'run', prompt])` or `claude` CLI calls for real-world coding tasks
- [ ] **Phase 14 · Navmesh pathfinding:** migrate from BFS waypoint graphs to `@recast-navigation/three` for true obstacle-avoiding crowd simulation

<br/>

## 📄 License

This project is proprietary and built for the Atelier AI ecosystem.

<div align="center">

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&height=120&color=0:B96D3D,100:F1E7D8&section=footer" alt="footer" width="100%" />

<sub>Built with Three.js, LangGraph and a lot of terracotta.</sub>

</div>
