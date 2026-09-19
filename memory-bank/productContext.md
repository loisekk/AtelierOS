# Product Context — Atelier AI Company OS

## Why it exists
LLM-agent teams are managed through flat chat logs. Atelier gives the "CEO"
(user) an embodied, spatial mental model: you see WHERE work happens, WHO is
working, and WHAT each room is doing — before reading a single log line.

## The user
A single CEO-operator who:
- dispatches tasks by text or voice (`useVoice`, Web Speech API),
- hires agents from a catalog (agent modal → avatar spawns at a workstation),
- watches live progress via task list, right-panel logs, and 3D screens,
- customizes the office (Customize Mode: move/rotate/delete furniture, undo),
- resets or re-bakes the canonical layout at will.

## Rooms (10 zones, SpatialConfig v1.2 rotated axes)
Front-back = X (front/reception = +X, rear/rotunda = −X), left-right = Z
(home side = +Z, showcase side = −Z):
home_workspace, brain_chamber (rotunda), showcase, agent_space, command_hub,
office_floor, knowledge_hub, meeting_room, ai_club, reception.

## Current UX pain points (the 5 decoded work items, see activeContext.md)
- **A**: purple Brain platform/ring/particles render on the ROOF (img-1) —
  brain must be furniture inside the rotunda chamber.
- **B**: the 8 seats are not ringed around the CEO Brain (img-3) — v3.4 ring
  chairs exist in data but the live scene may still run the old layout.
- **C**: bookshelf runs pierce the building walls (img-4).
- **D**: wall screens are dead decoration; they should be live "room boards"
  (room name, agents in room + statuses, latest room logs) — img-2 blue boards.
- **F**: UI background/left/right panels should match the reference look (img-5);
  requires the user to paste `styles/index.css`, TopBar/LeftPanel/RightPanel,
  CanvasViewport if the goal is a restore, not just adoption.

## Desired experience after A–D
Brain sits on the rotunda dais ringed by 8 chairs; shelves hug walls inside
bounds; every wall screen shows live per-room state; dispatching a task makes
boards + desk monitors light up with logs and status colors
(working=#059669, error=#DC2626, waiting=#D97706, celebrate=#0EA5E9).
