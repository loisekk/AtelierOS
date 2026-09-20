import * as THREE from 'three';
import { ROOM_ZONES } from './SpatialConfig';
import type { RoomId } from './SpatialConfig';

/**
 * Room banners v4.2.5 — content: ROOM_BANNERS · placement: ROOM_ANCHORS
 * (measured furniture centroids — SINGLE SOURCE OF TRUTH, see below).
 * The old hand-tuned ROOM_LABELS drifted from the real rooms; the v4.2.4
 * rect-derived targets drifted again (up to 6.4 m vs the furniture dump).
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

const BANNER_HOVER = 4.2;   // hover height above the dollhouse walls (world units over floorY)
const BANNER_W = 5.2;       // sprite world width (height keeps the canvas aspect)
const BANNER_PUSH_CAP = 13; // max parallax compensation (near-horizontal camera views)

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
 * v4.2.5 — MEASURED-CENTROID ground targets + v4.2.4 parallax compensation.
 * A hovering sprite is a fixed world point, but the oblique dollhouse camera
 * (elevation ≈ 28–40°) shifts a point at hover height ≈8 ground units
 * "up-screen" toward the rotunda — one full room row. That is exactly what
 * made the v4.2.3 static anchors break: top-row banners floated over the
 * roofline and every other banner sat over the room ABOVE its own. A static
 * anchor can never satisfy both the dollhouse view and the 2D top view
 * (ortho has zero parallax), so placement is target + camera-aware:
 *   · GROUND TARGET — the point the banner must visually sit over. v4.2.4
 *     derived targets from ROOM_ZONES rects (rear −X wall + 1.75 inset,
 *     z-mid) — but zone rects are NOT furniture: reception rect-target
 *     (12.75, 0) vs furniture centroid (18.5, 0) = 5.75 m of drift,
 *     home_workspace 6.38 m, showcase 5.86 m. v4.2.5 targets are the
 *     validateLayout furniture centroids (the same dump that anchored the
 *     brain fix). ROOM_ANCHORS is the SINGLE SOURCE OF TRUTH for banner
 *     placement — never derive banner positions from rects again.
 *   · updateBannerPlacement() casts the camera ray through that ground point
 *     onto the hover plane, so the sprite projects EXACTLY onto the target's
 *     screen point at ANY camera angle — the banner reads as centered over
 *     its room in every view (image-3 rule).
 *   · brain_chamber is FIXED: pinned to the rotunda's west rim (−16.0, −0.3),
 *     NOT the zone rect center (−16.25, 0) — that point raycasts at 14.14 =
 *     the rotunda WALL TOP (see BRAIN_ANCHOR doc in SpatialConfig). The rim
 *     target is 0.39 m from the centroid (inside tolerance), keeps the
 *     banner north of the brain, and the 14-unit ring would swallow any
 *     compensated move — so the rim itself is the target.
 */
export const ROOM_ANCHORS: Record<RoomId, { x: number; z: number; hover?: number; fixed?: boolean }> = {
  // validateLayout furniture centroids (v4 dump) — banner ground targets
  home_workspace: { x: -14.4, z: 12.9 },
  brain_chamber:  { x: -16.0, z: -0.3, hover: 4.8, fixed: true }, // measured rotunda west rim — see note above
  showcase:       { x: -14.9, z: -11.9 },
  agent_space:    { x: -4.7,  z: 12.3 },
  command_hub:    { x: -0.4,  z: -1.9 },
  office_floor:   { x: -6.6,  z: -11.8 },
  knowledge_hub:  { x: 5.7,   z: 12.2 },
  meeting_room:   { x: 6.2,   z: 1.9 },
  ai_club:        { x: 6.1,   z: -12.2 },
  reception:      { x: 18.5,  z: 0 },
};

interface BannerGround { x: number; z: number; hover: number; fixed: boolean }

const ZONES_BY_ID = new Map(ROOM_ZONES.map(zone => [zone.id, zone]));

function bannerGround(id: RoomId): BannerGround {
  const a = ROOM_ANCHORS[id];
  return { x: a.x, z: a.z, hover: a.hover ?? BANNER_HOVER, fixed: !!a.fixed };
}

// Scratch vector — no per-frame allocation in the render loop.
const _camPos = new THREE.Vector3();

/**
 * Per-frame banner placement: compensates the active camera's parallax so
 * every banner projects exactly onto its room's ground target. Ortho (2D
 * view) has zero parallax — sprites sit straight above the target. Call
 * after controls.update() and before render.
 */
export function updateBannerPlacement(group: THREE.Group, camera: THREE.Camera, floorY: number): void {
  group.children.forEach(child => {
    const sprite = child as THREE.Sprite;
    const zoneId = sprite.userData.zone as RoomId | undefined;
    const zone = zoneId ? ZONES_BY_ID.get(zoneId) : undefined;
    if (!zone) return;
    const g = bannerGround(zone.id);
    const hoverY = floorY + g.hover;
    if (g.fixed || (camera as THREE.OrthographicCamera).isOrthographicCamera) {
      sprite.position.set(g.x, hoverY, g.z);
      return;
    }
    _camPos.copy(camera.position);
    // Perspective: intersect the camera→ground-target ray with the hover
    // plane. The sprite center then projects exactly onto the target's
    // screen point. t = (hoverY − camY) / (floorY − camY).
    const denom = floorY - _camPos.y; // < 0 looking down · > 0 looking up
    let t = 1;
    if (Math.abs(denom) > 1e-3) {
      t = (hoverY - _camPos.y) / denom;
      // Cap the compensation: near-horizontal views would fling sprites far
      // east (and shrink them); clamp instead of chasing the target exactly.
      const horiz = Math.hypot(g.x - _camPos.x, g.z - _camPos.z);
      if (horiz > 1e-3) t = Math.min(t, (horiz + BANNER_PUSH_CAP) / horiz);
      t = Math.max(t, 0.05);
    }
    sprite.position.set(
      _camPos.x + (g.x - _camPos.x) * t,
      hoverY,
      _camPos.z + (g.z - _camPos.z) * t,
    );
  });
}

/**
 * Adds one transparent banner sprite per room. Initial placement uses the
 * ground targets; the engine re-runs updateBannerPlacement() every frame so
 * banners stay pinned to their room's top edge as the camera moves.
 * Returns the group so the engine can toggle visibility (Labels button).
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