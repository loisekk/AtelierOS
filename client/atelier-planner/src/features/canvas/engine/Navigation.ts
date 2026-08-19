import * as THREE from 'three';

// Helper function to easily create Vector3s from arrays (replaces the missing 'V' import)
const V = (arr: [number, number, number]) => new THREE.Vector3(arr[0], arr[1], arr[2]);

// TODO: UPDATE THESE COORDINATES USING THE logCameraPosition() DEBUG TOOL IN ATELIERENGINE.TS
// For now, they are set to temporary placeholders for rapid validation.
const WAYPOINT_SEEDS: Record<string, [number, number, number]> = {
  office_center: [0, 0, 5],
  office_door: [0, 0, 3],
  spine_center: [0, 0, 0],
  meeting_door: [0, 0, -3],
  meeting_table: [0, 0, -5],
  knowledge_door: [-8, 0, 4.5],
  knowledge_center: [-19.5, 0, 7.5],
  ceo_door: [0, 0, -4.5],
  ceo_center: [0, 0, -8.0]
};

// Convert the seeds into actual THREE.Vector3 objects for the pathfinding engine
export const WAYPOINTS: Record<string, THREE.Vector3> = Object.fromEntries(
  Object.entries(WAYPOINT_SEEDS).map(([key, pos]) => [key, V(pos)])
);

const EDGES: Record<string, string[]> = {
  office_center: ['office_door'],
  office_door: ['office_center', 'spine_center'],
  spine_center: ['office_door', 'meeting_door', 'knowledge_door', 'ceo_door'],
  meeting_door: ['spine_center', 'meeting_table'],
  meeting_table: ['meeting_door'],
  knowledge_door: ['spine_center', 'knowledge_center'],
  knowledge_center: ['knowledge_door'],
  ceo_door: ['spine_center', 'ceo_center'],
  ceo_center: ['ceo_door']
};

export function findPath(startKey: string, endKey: string): THREE.Vector3[] {
  const queue: string[] = [startKey];
  const visited: Record<string, boolean> = { [startKey]: true };
  const parent: Record<string, string | null> = { [startKey]: null };

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endKey) break;
    (EDGES[current] || []).forEach(neighbor => {
      if (!visited[neighbor]) {
        visited[neighbor] = true;
        parent[neighbor] = current;
        queue.push(neighbor);
      }
    });
  }

  const path: THREE.Vector3[] = [];
  let current: string | null = endKey;
  while (current) {
    // Safety check: if a waypoint is somehow missing, default to 0,0,0 to prevent crashes
    path.unshift(WAYPOINTS[current] || new THREE.Vector3(0, 0, 0));
    current = parent[current];
  }
  return path;
}

export function getClosestWaypoint(pos: THREE.Vector3): string {
  let closestWaypoint = 'office_center';
  let minDist = Infinity;
  
  Object.entries(WAYPOINTS).forEach(([key, p]) => {
    const d = pos.distanceTo(p);
    if (d < minDist) { 
      minDist = d; 
      closestWaypoint = key; 
    }
  });
  
  return closestWaypoint;
}