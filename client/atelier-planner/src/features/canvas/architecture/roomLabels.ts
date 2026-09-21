import * as THREE from 'three';
import { ROOM_ZONES } from './SpatialConfig';
import type { RoomId } from './SpatialConfig';

/**
 * Room banners v4.4 — content: ROOM_BANNERS · placement: ROOM_ANCHORS.
 * v4.4 IN-ROOM placement (reference img 2/img 3): each banner sits ~4.5–5
 * units INSIDE its room's rear (minX) wall at a LOW hover. The default
 * office rig (elev ≈ 31°) projects hover ≈ 0.86× up-screen but room depth
 * only ≈ 0.52× down-screen, so the v4.3 rear-edge + hover-4.2 anchors
 * floated OUTSIDE the building (home/showcase) or into the rotunda
 * (command hub). Brain chamber keeps its measured rotunda override
 * (a zone-derived anchor there would sit inside the wall).
 * Style: transparent dark-glass pill matching the reference render.
 */
export const ROOM_BANNERS: Record<RoomId, { text: string; sub: string; accent: string }> = {
  home_workspace: { text: 'HOME WORKSPACE',    sub: 'CEO Personal Overview',        accent: '#E8A15D' },
  brain_chamber:  { text: 'CEO BRAIN CORE',    sub: '3D Brain & Command Center',    accent: '#C494FF' },
  showcase:       { text: 'WORKSPACE SHOWCASE', sub: 'Active Projects Overview',    accent: '#49D8EC' },
  agent_space:    { text: 'AGENT SPACE',       sub: 'Your AI Employees',            accent: '#7FD6A0' },
  command_hub:    { text: 'COMMAND HUB',       sub: 'Dispatch · Monitor · Control', accent: '#49D8EC' },
  office_floor:   { text: 'OFFICE FLOOR',      sub: 'Co-Workers & Teams',           accent: '#A8C97F' },
  knowledge_hub:  { text: 'KNOWLEDGE HUB',     sub: 'Company Memory & Docs',        accent: '#9FBEE8' },
  meeting_room:   { text: 'MEETING ROOM',      sub: 'Team Meetings & Strategy',     accent: '#E8C36A' },
  ai_club:        { text: 'AI CLUB LOUNGE',    sub: 'Break · Chat & Social',        accent: '#C494FF' },
  reception:      { text: 'RECEPTION',         sub: 'Welcome to Atelier HQ',        accent: '#E8A15D' },
};

/** Banner lookup for room boards (zone id → banner content). */
export function roomBannerFor(zoneId: string): { text: string; sub: string; accent: string } | null {
  return (ROOM_BANNERS as Record<string, { text: string; sub: string; accent: string }>)[zoneId] ?? null;
}

const BANNER_HOVER = 2.8;   // low in-room hover (img 3 look) — the high office rig still clears every interior wall
const BANNER_W = 5.2;       // sprite world width (height keeps the canvas aspect)

// v4.2.6 — close-orbit fade. The building is an open-top diorama with
// depthTest ON, so from any raised angle the sight line to every banner
// passes over the walls — all 10 read at once, and close orbiting stacks
// them visually. Fade is camera-distance-driven, NOT per-depth flags:
//   · camera ≥ BANNER_FADE_CAM_FAR from origin (zoomed-out dollhouse,
//     incl. the default office rig ≈ 43) → every banner full opacity
//   · ortho (2D top view) → always full
//   · camera ≤ BANNER_FADE_CAM_NEAR (close inspection) → only banners
//     within BANNER_FADE_NEAR_D of the camera stay full; the rest fade
//     to zero over BANNER_FADE_SPAN, so the inspected room's banner
//     reads on top instead of all ten superimposed.
const BANNER_FADE_CAM_NEAR = 22; // camera distance below this → fading active
const BANNER_FADE_CAM_FAR = 40;  // camera distance above this → all banners full
const BANNER_FADE_NEAR_D = 25;   // label within this distance of camera stays full
const BANNER_FADE_SPAN = 45;     // labels fade to zero over this span beyond it

function createLabelTexture(text: string, subtext: string, accent: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // v4.2 — image-3 banner style: compact dark pill, title, thin divider, sub
  ctx.clearRect(0, 0, 512, 160);
  ctx.fillStyle = 'rgba(20, 16, 12, 0.82)';
  ctx.beginPath(); ctx.roundRect(8, 14, 496, 132, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(8, 14, 496, 132, 18); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#F4EDE3';
  ctx.font = 'bold 34px Archivo, sans-serif';
  ctx.fillText(text, 256, 64);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(196, 84); ctx.lineTo(316, 84); ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '21px Manrope, sans-serif';
  ctx.fillText(subtext, 256, 120);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * v4.2.7 — STATIC placement (user decision) · v4.2.6 close-orbit fade ·
 * v4.3 start-of-room anchors.
 *   · GROUND TARGET — the point the banner sits over: the room's start
 *     (rear/minX) edge, z-centered (see ROOM_ANCHORS v4.3 note below). The
 *     earlier furniture-centroid and rect-derived targets sat at the middle
 *     of each room; the reference look pins every banner at the top edge.
 *   · BANNERS NEVER MOVE WITH THE CAMERA. v4.2.4's per-frame parallax
 *     compensation slid each sprite toward the camera (capped at 13 units)
 *     so all ten banners visibly swooped toward the viewer while orbiting —
 *     rejected as ugly. Static placement is the reference look: every banner
 *     pinned over its room, exactly like the 2D top-view screenshot.
 *     Accepted trade: at oblique dollhouse angles a hover sprite reads a
 *     FIXED amount "up-screen" from its target — constant for a given
 *     camera pose, zero motion.
 *   · brain_chamber override kept at the measured rotunda west rim
 *     (−16.0, −0.3, hover 4.8), NOT the zone rect center (−16.25, 0) —
 *     that point raycasts at 14.14 = the rotunda WALL TOP (see
 *     BRAIN_ANCHOR doc in SpatialConfig); 0.39 m from the centroid, banner
 *     stays north of the brain, clear of the 14-unit ring.
 */
export const ROOM_ANCHORS: Record<RoomId, { x: number; z: number; hover?: number }> = {
  // v4.4 — IN-ROOM placement (reference img 2/img 3): every banner sits just
  // INSIDE its room's top (screen-up = −X) edge, horizontally centered, at a
  // LOW hover (2.8). Inset from the rear wall: rear band 5.0, middle/front
  // bands 4.5; z = zone center. v4.3's rear-edge + hover-4.2 anchors
  // projected above the outer walls on the default office rig (elev ≈ 31°:
  // hover shifts up-screen 0.86/unit, room depth only 0.52/unit).
  home_workspace: { x: -17.5, z: 12.2 },
  brain_chamber:  { x: -16.0, z: -0.3, hover: 4.8 }, // measured rotunda west rim — see note above
  showcase:       { x: -17.5, z: -12.2 },
  agent_space:    { x: -5.5,  z: 12.2 },
  command_hub:    { x: -5.5,  z: 0 },
  office_floor:   { x: -5.5,  z: -12.2 },
  // v4.2.8 — front row zones v1.3: Knowledge Hub = front-left corner room,
  // AI Club Lounge = front-right corner room, Meeting Room = middle front,
  // Reception = the gate ONLY. Banners just inside each room's rear wall.
  knowledge_hub:  { x: 5.5,   z: 12.2 },
  meeting_room:   { x: 5.5,   z: 0 },
  ai_club:        { x: 5.5,   z: -12.2 },
  reception:      { x: 18.5,  z: 0 }, // gate foyer arch, per img 2
};

interface BannerGround { x: number; z: number; hover: number }

const ZONES_BY_ID = new Map(ROOM_ZONES.map(zone => [zone.id, zone]));

function bannerGround(id: RoomId): BannerGround {
  const a = ROOM_ANCHORS[id];
  return { x: a.x, z: a.z, hover: a.hover ?? BANNER_HOVER };
}

// Scratch vector — no per-frame allocation in the render loop.
const _camPos = new THREE.Vector3();

/**
 * Per-frame banner maintenance: static placement + close-orbit opacity fade.
 * v4.2.7 — banners NEVER move with the camera. The v4.2.4 parallax
 * compensation slid sprites toward the camera every frame (up to 13 units),
 * which made all ten banners swoop toward the viewer while orbiting — the
 * user rejected that. Static ground-target placement is the reference look.
 * Call after controls.update() and before render.
 */
export function updateBannerPlacement(group: THREE.Group, camera: THREE.Camera, floorY: number): void {
  group.children.forEach(child => {
    const sprite = child as THREE.Sprite;
    const zoneId = sprite.userData.zone as RoomId | undefined;
    const zone = zoneId ? ZONES_BY_ID.get(zoneId) : undefined;
    if (!zone) return;
    const g = bannerGround(zone.id);
    // STATIC — the same world position every frame, pinned over the room's
    // furniture centroid. Opacity is the only per-frame property.
    sprite.position.set(g.x, floorY + g.hover, g.z);
    const mat = sprite.material as THREE.SpriteMaterial;
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      mat.opacity = 1; // 2D top view — all banners fully visible
      return;
    }
    _camPos.copy(camera.position);
    // Close-orbit fade (opacity ONLY — never position): zoomed-out dollhouse
    // keeps every banner full; orbiting close dims banners beyond
    // BANNER_FADE_NEAR_D so only the inspected room's banner reads on top.
    const camNear = THREE.MathUtils.smoothstep(_camPos.length(), BANNER_FADE_CAM_NEAR, BANNER_FADE_CAM_FAR);
    if (camNear >= 1) { mat.opacity = 1; return; }
    const d = _camPos.distanceTo(sprite.position);
    const labelOpacity = THREE.MathUtils.clamp(1 - (d - BANNER_FADE_NEAR_D) / BANNER_FADE_SPAN, 0, 1);
    mat.opacity = labelOpacity + camNear * (1 - labelOpacity);
  });
}

/**
 * Adds one transparent banner sprite per room, statically placed over its
 * ground target. The engine re-runs updateBannerPlacement() every frame —
 * placement is static; that call only maintains the close-orbit opacity
 * fade. Returns the group so the engine can toggle visibility (Labels
 * button).
 */
export function addRoomLabels(scene: THREE.Scene, baseY: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'room_banners';
  ROOM_ZONES.forEach(zone => {
    const meta = ROOM_BANNERS[zone.id];
    if (!meta) return;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createLabelTexture(meta.text, meta.sub, meta.accent),
      transparent: true,
      depthWrite: false,
    }));
    sprite.userData.zone = zone.id;
    const g = bannerGround(zone.id);
    sprite.position.set(g.x, baseY + g.hover, g.z);
    sprite.scale.set(BANNER_W, BANNER_W * (160 / 512), 1);
    group.add(sprite);
  });
  scene.add(group);
  return group;
}