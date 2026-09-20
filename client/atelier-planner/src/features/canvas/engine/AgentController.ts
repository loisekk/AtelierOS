import * as THREE from 'three';
import type { PlacedItemMeta, AgentStatus } from '../../ai-agents/types';
import { findPath, getClosestWaypoint } from './Navigation';
import { ScreenManager } from './ScreenManager';
import { MEETING_ANCHOR, WORLD } from '../architecture/SpatialConfig';

const WALK_SPEED = 1.6; // human office pace — no running

/**
 * Structural subset of AtelierEngine's EngineCallbacks. Structural typing
 * means the engine passes its real callbacks object with zero adapters.
 */
interface EngineCallbacksLike {
  onStatsUpdate: (items: PlacedItemMeta[]) => void;
  onSelect: (id: string | null) => void;
}

export class AgentController {
  private scene: THREE.Scene;
  private screenManager: ScreenManager;
  private placedItems: PlacedItemMeta[];
  private meshes: Map<string, THREE.Group>;
  private avatars: Map<string, THREE.Group>;

  public floorY: number = WORLD.floorY;

  private agentPaths = new Map<string, THREE.Vector3[]>();
  private agentWalkTargets = new Map<string, string>();

  private meetingBubble!: THREE.Mesh;
  private meetingBubbleLight!: THREE.PointLight;
  private meetingTimer: number | null = null;
  private meetingAgents: string[] = [];

  private _dir = new THREE.Vector3();

  constructor(scene: THREE.Scene, screenManager: ScreenManager, placedItems: PlacedItemMeta[], meshes: Map<string, THREE.Group>, avatars: Map<string, THREE.Group>) {
    this.scene = scene;
    this.screenManager = screenManager;
    this.placedItems = placedItems;
    this.meshes = meshes;
    this.avatars = avatars;
    this.setupMeetingBubble();
  }

  private setupMeetingBubble() {
    const geo = new THREE.SphereGeometry(1.5, 32, 32);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x7C3AED, emissive: 0x7C3AED, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.25, roughness: 0.1, transmission: 0.9
    });
    this.meetingBubble = new THREE.Mesh(geo, mat);
    this.meetingBubble.position.copy(MEETING_ANCHOR);
    this.meetingBubble.visible = false;
    this.scene.add(this.meetingBubble);

    this.meetingBubbleLight = new THREE.PointLight(0x7C3AED, 0, 10);
    this.meetingBubbleLight.position.copy(this.meetingBubble.position);
    this.scene.add(this.meetingBubbleLight);
  }

  public startMeeting(agentIds: string[]) {
    if (agentIds.length === 0) return;
    this.meetingAgents = agentIds;
    this.meetingBubble.visible = true;
    this.meetingBubbleLight.intensity = 3;
    agentIds.forEach(id => this.walkAgentTo(id, 'meeting_table'));
  }

  public walkAgentTo(agentId: string, destinationKey: string) {
    const item = this.placedItems.find(i => i.id === agentId);
    const avatar = this.avatars.get(agentId);
    if (!item || !avatar) return;

    if (avatar.parent !== this.scene) this.scene.attach(avatar);

    const deskPos = new THREE.Vector3(item.position.x, 0, item.position.z);
    const startKey = getClosestWaypoint(deskPos);
    const path = findPath(startKey, destinationKey);

    if (path.length > 0) {
      this.agentPaths.set(agentId, path);
      this.agentWalkTargets.set(agentId, destinationKey);
      this.updateAgentStatus(agentId, 'walking');
    }
  }

  public returnAgentToDesk(agentId: string) {
    const item = this.placedItems.find(i => i.id === agentId);
    const avatar = this.avatars.get(agentId);
    if (!item || !avatar) return;

    const deskMesh = this.meshes.get(item.id);
    if (deskMesh) {
      deskMesh.attach(avatar);
      avatar.position.set(0, 0.06, 0);  // v4.2 seated pose: hips on the seat
      avatar.rotation.y = Math.PI;      // eyes on the monitors (desk side)
    }
    this.agentPaths.delete(agentId);
    this.agentWalkTargets.delete(agentId);
    this.updateAgentStatus(agentId, 'idle');
  }

  public updateAgentStatus(id: string, status: AgentStatus, callbacks?: EngineCallbacksLike) {
    const item = this.placedItems.find(i => i.id === id);
    if (item) {
      item.status = status;
      const mesh = this.meshes.get(id);
      if (mesh) this.screenManager.updateAgentScreenStatus(mesh, status);
      if (callbacks?.onStatsUpdate) callbacks.onStatsUpdate(this.placedItems);
    }
  }

  public update(dt: number, t: number, callbacks: EngineCallbacksLike) {
    const fy = this.floorY;

    if (this.meetingBubble.visible) {
      this.meetingBubble.rotation.y += 0.01;
      this.meetingBubble.position.y = MEETING_ANCHOR.y + fy + Math.sin(t * 2) * 0.2;
    }

    if (this.meetingTimer !== null) {
      this.meetingTimer -= dt;
      if (this.meetingTimer <= 0) {
        this.meetingTimer = null;
        this.meetingBubble.visible = false;
        this.meetingBubbleLight.intensity = 0;
        this.meetingAgents.forEach(id => this.returnAgentToDesk(id));
        this.meetingAgents = [];
      }
    }

    this.placedItems.forEach(item => {
      if (!item.role) return;
      const avatar = this.avatars.get(item.id);
      if (!avatar) return;

      const head = avatar.userData.head as THREE.Group;
      const lArm = avatar.userData.leftArm as THREE.Group;
      const rArm = avatar.userData.rightArm as THREE.Group;

      // CRITICAL FIX: only touch world position when the avatar is detached
      // and walking. While it is a child of a desk/seat group, its LOCAL
      // transform (0, 0.49, 0.4) IS the seated pose — never overwrite it.
      const seated = avatar.parent !== this.scene;

      if (!seated) {
        const path = this.agentPaths.get(item.id);
        if (path && path.length > 0) {
          const target = path[0];
          const pos = avatar.position;
          const dir = this._dir.set(target.x - pos.x, 0, target.z - pos.z);
          const dist = dir.length();

          if (dist < 0.5) {
            path.shift();
            if (path.length === 0) {
              this.agentPaths.delete(item.id);
              const targetKey = this.agentWalkTargets.get(item.id);
              this.agentWalkTargets.delete(item.id);

              if (targetKey === 'desk') {
                this.returnAgentToDesk(item.id);
              } else if (targetKey === 'meeting_table') {
                this.updateAgentStatus(item.id, 'waiting', callbacks);
                avatar.rotation.y = Math.atan2(MEETING_ANCHOR.x - avatar.position.x, MEETING_ANCHOR.z - avatar.position.z);

                const allArrived = this.meetingAgents.every(id => {
                  const agentItem = this.placedItems.find(i => i.id === id);
                  return agentItem && agentItem.status === 'waiting';
                });
                if (allArrived && this.meetingTimer === null && this.meetingAgents.length > 0) {
                  this.meetingTimer = 6.0;
                }
              } else {
                this.updateAgentStatus(item.id, 'working', callbacks);
              }
            }
          } else {
            dir.normalize();
            const speed = WALK_SPEED * dt;
            avatar.position.x += dir.x * speed;
            avatar.position.z += dir.z * speed;
            avatar.rotation.y = Math.atan2(dir.x, dir.z);
          }
        }

        // World-space vertical animation ONLY while walking/standing free
        if (item.status === 'walking') {
          avatar.position.y = fy + 0.1 + Math.abs(Math.sin(t * 8)) * 0.05;
        } else if (item.status === 'waiting') {
          avatar.position.y = fy + 0.1 + Math.sin(t * 1.5) * 0.02;
        } else if (item.status === 'celebrate') {
          avatar.position.y = fy + 0.1 + Math.abs(Math.sin(t * 6)) * 0.15;
        } else if (item.status === 'error') {
          avatar.position.x += Math.sin(t * 40) * 0.002;
          avatar.position.y = fy + 0.1;
        } else {
          avatar.position.y = fy + 0.1 + Math.sin(t * 2) * 0.01;
        }
      }

      // Upper-body animation applies in BOTH seated and free states
      if (item.status === 'walking' && !seated) {
        lArm.rotation.x = Math.sin(t * 8) * 0.5;
        rArm.rotation.x = -Math.sin(t * 8) * 0.5;
        if (head) head.rotation.x = 0;
      } else if (item.status === 'working') {
        lArm.rotation.x = Math.sin(t * 12) * 0.4 - 1.2;
        rArm.rotation.x = Math.sin(t * 12 + Math.PI / 3) * 0.4 - 1.2;
        if (head) head.rotation.x = -0.2;
      } else if (item.status === 'waiting') {
        lArm.rotation.x = 0; rArm.rotation.x = 0;
        if (head) head.rotation.x = 0;
      } else if (item.status === 'error') {
        lArm.rotation.x = 0; rArm.rotation.x = 0;
        if (head) head.rotation.x = 0;
      } else if (item.status === 'celebrate') {
        lArm.rotation.x = -2.5; rArm.rotation.x = -2.5;
        if (head) head.rotation.x = 0;
      } else {
        lArm.rotation.x = -1.2; rArm.rotation.x = -1.2;
        if (head) head.rotation.x = 0;
      }
    });
  }
}