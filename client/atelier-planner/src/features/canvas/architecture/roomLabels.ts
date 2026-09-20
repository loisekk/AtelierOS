import * as THREE from 'three';
import { ROOM_ZONES } from './SpatialConfig';
import type { RoomId } from './SpatialConfig';

/**
 * Room banners v2 — content + placement DERIVED FROM ROOM_ZONES.
 * The old ROOM_LABELS hand-tuned positions drifted from the real rooms
 * (banners floating between rooms / on the old brain fallback). Zones are
 * the only valid ruler — the same principle as the v4.0 layout system.
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

const BANNER_INSET = 1.75;  // visual target: this far inside the room's rear (−X) wall
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
 * v4.2.4 — GROUND-TARGET banners + per-camera parallax compensation.
 * A hovering sprite is a fixed world point, but the oblique dollhouse camera
 * (elevation ≈ 28–40°) shifts a point at hover height ≈8 ground units
 * "up-screen" toward the rotunda — one full room row. That is exactly what
 * made the v4.2.3 static anchors break: top-row banners floated over the
 * roofline and every other banner sat over the room ABOVE its own. A static
 * anchor can never satisfy both the dollhouse view and the 2D top view
 * (ortho has zero parallax), so placement is now rule-based + camera-aware:
 *   · GROUND TARGET — the point the banner must visually sit over: the
 *     room's rear (−X) wall + BANNER_INSET, centered across its width.
 *   · updateBannerPlacement() casts the camera ray through that ground point
 *     onto the hover plane, so the sprite projects EXACTLY onto the target's
 *     screen point at ANY camera angle — the banner reads as pinned above
 *     its room's top edge in every view (image-3 rule).
 *   · brain_chamber is FIXED: pinned to the rotunda's west rim, north of
 *     the dais (never on the brain). The 14-unit rotunda wall would swallow
 *     any compensated move, so the rim itself is the target.
 *   · command_hub insets from the rotunda's east face instead of zone.minX —
 *     the brain zone rect (minX −10) sits INSIDE the rotunda ring, so the
 *     zone-derived west wall would land the banner on the ring, not the hub.
 */
const BANNER_GROUND: Partial<Record<RoomId, { x: number; z: number; hover?: number; fixed?: boolean }>> = {
  brain_chamber: { x: -16.0, z: -0.3, hover: 4.8, fixed: true },
  command_hub:   { x: -4.2,  z: 0 },
};

interface BannerGround { x: number; z: number; hover: number; fixed: boolean }

const ZONES_BY_ID = new Map(ROOM_ZONES.map(zone => [zone.id, zone]));

function bannerGround(zone: (typeof ROOM_ZONES)[number]): BannerGround {
  const hit = BANNER_GROUND[zone.id];
  if (hit) return { x: hit.x, z: hit.z, hover: hit.hover ?? BANNER_HOVER, fixed: !!hit.fixed };
  return {
    x: zone.minX + BANNER_INSET,
    z: (zone.minZ + zone.maxZ) / 2,
    hover: BANNER_HOVER,
    fixed: false,
  };
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
    const g = bannerGround(zone);
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
    const g = bannerGround(zone);
    sprite.position.set(g.x, baseY + g.hover, g.z);
    sprite.scale.set(BANNER_W, BANNER_W * (160 / 512), 1);
    group.add(sprite);
  });
  scene.add(group);
  return group;
}