import * as THREE from 'three';
import type { PlacedItemMeta, AgentStatus } from '../../ai-agents/types';
import { findPath, getClosestWaypoint } from './Navigation';
import { ScreenManager } from './ScreenManager';

export class AgentController {
  private scene: THREE.Scene;
  private screenManager: ScreenManager;
  private placedItems: PlacedItemMeta[];
  private meshes: Map<string, THREE.Group>;
  private avatars: Map<string, THREE.Group>;

  private agentPaths = new Map<string, THREE.Vector3[]>();
  private agentWalkTargets = new Map<string, string>();

  private meetingBubble!: THREE.Mesh;
  private meetingBubbleLight!: THREE.PointLight;
  private meetingTimer: number | null = null;
  private meetingAgents: string[] = [];

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
    this.meetingBubble.position.set(15, 2.5, 11);
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

    const deskPos = new THREE.Vector3(item.position.x, 0, item.position.z);
    const startKey = getClosestWaypoint(deskPos);
    const path = findPath(startKey, 'office_center');
    path.push(deskPos);
    
    this.agentPaths.set(agentId, path);
    this.agentWalkTargets.set(agentId, 'desk');
    this.updateAgentStatus(agentId, 'walking');
  }

  public updateAgentStatus(id: string, status: AgentStatus, callbacks?: any) {
    const item = this.placedItems.find(i => i.id === id);
    if (item) {
      item.status = status;
      const mesh = this.meshes.get(id);
      if (mesh) this.screenManager.updateAgentScreenStatus(mesh, status);
      if (callbacks?.onStatsUpdate) callbacks.onStatsUpdate(this.placedItems);
    }
  }

  public update(dt: number, t: number, callbacks: any) {
    if (this.meetingBubble.visible) {
      this.meetingBubble.rotation.y += 0.01;
      this.meetingBubble.position.y = 2.5 + Math.sin(t * 2) * 0.2;
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

      const path = this.agentPaths.get(item.id);
      if (path && path.length > 0) {
        const target = path[0];
        const pos = avatar.position;
        const dir = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
        const dist = dir.length();
        
        if (dist < 0.5) {
          path.shift(); 
          if (path.length === 0) {
            this.agentPaths.delete(item.id);
            const targetKey = this.agentWalkTargets.get(item.id);
            this.agentWalkTargets.delete(item.id);

            if (targetKey === 'desk') {
              const deskMesh = this.meshes.get(item.id);
              if (deskMesh) {
                deskMesh.attach(avatar);
                avatar.position.set(0, 0.49, 0.4);
                avatar.rotation.y = 0;
              }
              this.updateAgentStatus(item.id, 'idle', callbacks);
            } else if (targetKey === 'meeting_table') {
              this.updateAgentStatus(item.id, 'waiting', callbacks); 
              avatar.rotation.y = Math.atan2(15 - avatar.position.x, 11 - avatar.position.z); 

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
          const speed = 3.0 * dt; 
          avatar.position.x += dir.x * speed;
          avatar.position.z += dir.z * speed;
          const angle = Math.atan2(dir.x, dir.z);
          avatar.rotation.y = angle;
        }
      }

      // Animations
      if (item.status === 'walking') {
        avatar.position.y = 0.1 + Math.abs(Math.sin(t * 8)) * 0.05;
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
        avatar.position.y = 0.1 + Math.sin(t * 1.5) * 0.02;
      } else if (item.status === 'error') {
        lArm.rotation.x = 0; rArm.rotation.x = 0; 
        if (head) head.rotation.x = 0;
        avatar.position.x += Math.sin(t * 40) * 0.02;
      } else if (item.status === 'celebrate') {
        lArm.rotation.x = -2.5; rArm.rotation.x = -2.5;
        if (head) head.rotation.x = 0;
        avatar.position.y = 0.1 + Math.abs(Math.sin(t * 6)) * 0.15;
      } else {
        lArm.rotation.x = -1.2; rArm.rotation.x = -1.2; 
        if (head) head.rotation.x = 0;
        avatar.position.y = 0.1 + Math.sin(t * 2) * 0.01;
      }
    });
  }
}