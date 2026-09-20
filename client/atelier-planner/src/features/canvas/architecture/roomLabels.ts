import * as THREE from 'three';
import { ROOM_ZONES, BRAIN_ANCHOR } from './SpatialConfig';
import type { RoomId } from './SpatialConfig';
import { USER_DEFAULT_LAYOUT } from './layout/userDefaultLayout';

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

const BANNER_Y = 4.8;  // hover height above the walls (world units over baseY)
const BANNER_W = 5.2;  // sprite world width (height keeps the canvas aspect)

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
 * Banner anchor for a zone. v4.1: derived from the CEO's hand-placed furniture
 * centroid (USER_DEFAULT_LAYOUT = the ground truth of where each room really
 * is), NOT the zone rect center — the rects drift from the GLB rooms (the
 * brain_chamber rect center sits inside the rotunda wall). brain_chamber is
 * pinned to BRAIN_ANCHOR (raycast-measured dais center) so the banner, the
 * brain mesh and the chair ring can never disagree.
 */
function bannerAnchor(zone: (typeof ROOM_ZONES)[number]): [number, number] {
  if (zone.id === 'brain_chamber') return [BRAIN_ANCHOR.x, BRAIN_ANCHOR.z];
  const inZone = USER_DEFAULT_LAYOUT.filter(e =>
    e.x >= zone.minX && e.x <= zone.maxX && e.z >= zone.minZ && e.z <= zone.maxZ);
  if (inZone.length === 0) return [(zone.minX + zone.maxX) / 2, (zone.minZ + zone.maxZ) / 2];
  const cx = inZone.reduce((s, e) => s + e.x, 0) / inZone.length;
  const cz = inZone.reduce((s, e) => s + e.z, 0) / inZone.length;
  return [cx, cz];
}

/**
 * Adds one transparent banner sprite per room (furniture-centroid anchored).
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
    const [cx, cz] = bannerAnchor(zone);
    sprite.position.set(cx, baseY + BANNER_Y, cz);
    sprite.scale.set(BANNER_W, BANNER_W * (160 / 512), 1);
    group.add(sprite);
  });
  scene.add(group);
  return group;
}