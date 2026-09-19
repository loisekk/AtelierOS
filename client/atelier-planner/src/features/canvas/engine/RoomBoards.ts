import * as THREE from 'three';
import { ROOM_ZONES } from '../architecture/SpatialConfig';
import { roomBannerFor } from '../architecture/roomLabels';
import type { PlacedItemMeta } from '../../ai-agents/types';
import type { ScreenManager } from './ScreenManager';

export interface RoomBoardData {
  room: string;
  agents: { name: string; status: string }[];
  logs: string[];
}

/**
 * Task D — Live room info boards.
 * Every wall_screen renders its room's live state: room name, agents
 * present + statuses, latest routed log lines.
 *
 * Self-contained by design: owns zone lookup, per-room log buffers, and
 * lazy canvas-texture init — the engine only wires a few one-line hooks.
 */
export class RoomBoards {
  private screenManager: ScreenManager;
  private roomLogs = new Map<string, string[]>();

  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }

  static zoneIdAt(x: number, z: number): string | null {
    const zn = ROOM_ZONES.find(q => x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ);
    return zn?.id ?? null;
  }

  /** Route an agent's log line into its room buffer. */
  public routeLog(agentPos: { x: number; z: number }, log: string): void {
    const rid = RoomBoards.zoneIdAt(agentPos.x, agentPos.z);
    if (!rid) return;
    const arr = this.roomLogs.get(rid) ?? [];
    arr.push(log);
    if (arr.length > 6) arr.shift();
    this.roomLogs.set(rid, arr);
  }

  public clear(): void {
    this.roomLogs.clear();
  }

  /** Redraw every wall_screen with live data for its room. */
  public redraw(placedItems: PlacedItemMeta[], meshes: Map<string, THREE.Group>): void {
    const boardsByRoom = new Map<string, THREE.Group[]>();
    for (const item of placedItems) {
      if (item.type !== 'wall_screen') continue;
      const mesh = meshes.get(item.id);
      const rid = RoomBoards.zoneIdAt(item.position.x, item.position.z);
      if (!mesh || !rid) continue;
      const list = boardsByRoom.get(rid) ?? [];
      list.push(mesh);
      boardsByRoom.set(rid, list);
    }
    if (boardsByRoom.size === 0) return;

    for (const [rid, boards] of boardsByRoom) {
      const agents = placedItems
        .filter(i => i.role && RoomBoards.zoneIdAt(i.position.x, i.position.z) === rid)
        .map(i => ({ name: i.config?.name || i.name, status: i.status || 'idle' }));
      const data: RoomBoardData = { room: rid, agents, logs: this.roomLogs.get(rid) ?? [] };
      boards.forEach(b => this.drawBoard(b, data));
    }
  }

  private drawBoard(group: THREE.Object3D, data: RoomBoardData): void {
    group.traverse(c => {
      if (!(c instanceof THREE.Mesh)) return;
      if (!c.userData.isScreen || c.userData.screenType !== 'room_board') return;

      // Lazy texture init — boards own their canvas, so placeItem needs no changes.
      if (!c.userData.screenData) {
        const screenData = this.screenManager.createScreenTexture();
        const mat = c.material as THREE.MeshStandardMaterial;
        mat.map = screenData.texture;
        mat.emissiveMap = screenData.texture;
        mat.needsUpdate = true;
        c.userData.screenData = screenData;
      }

      const { ctx, texture } = c.userData.screenData;
      const banner = roomBannerFor(data.room);
      ctx.fillStyle = '#0A1420'; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = 'rgba(73, 216, 236, 0.7)'; ctx.lineWidth = 2; ctx.strokeRect(8, 8, 496, 240);
      // Header mirrors the room banner: title + subtitle, centered
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px Archivo, sans-serif'; ctx.fillStyle = '#FFFFFF';
      ctx.fillText((banner?.text ?? data.room.replace(/_/g, ' ')).toUpperCase(), 256, 38);
      ctx.font = '15px Manrope, sans-serif'; ctx.fillStyle = banner?.accent ?? '#49D8EC';
      if (banner?.sub) ctx.fillText(banner.sub, 256, 62);
      ctx.textAlign = 'left';
      ctx.font = '14px JetBrains Mono, monospace'; ctx.fillStyle = '#8A8A8A';
      ctx.fillText(`AGENTS IN ROOM: ${data.agents.length}`, 24, 90);
      data.agents.slice(0, 4).forEach((a, i) => {
        ctx.fillStyle = a.status === 'working' ? '#059669' : a.status === 'error' ? '#DC2626'
          : a.status === 'waiting' ? '#D97706' : a.status === 'celebrate' ? '#0EA5E9' : '#8A8A8A';
        ctx.fillText(`● ${a.name} — ${a.status.toUpperCase()}`, 24, 112 + i * 20);
      });
      ctx.fillStyle = '#4A4A52'; ctx.fillRect(24, 186, 464, 1);
      ctx.font = '13px JetBrains Mono, monospace'; ctx.fillStyle = '#0EA5E9';
      data.logs.slice(-3).forEach((l, i) => ctx.fillText(`> ${l.substring(0, 46)}`, 24, 206 + i * 18));
      texture.needsUpdate = true;
    });
  }
}