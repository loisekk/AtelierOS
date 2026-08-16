import * as THREE from 'three';

export const WAYPOINTS: Record<string, THREE.Vector3> = {
  office_center: new THREE.Vector3(35, 0, 0),
  office_door: new THREE.Vector3(25, 0, 0),
  spine_center: new THREE.Vector3(15, 0, 0),
  meeting_door: new THREE.Vector3(15, 0, 7),
  meeting_table: new THREE.Vector3(15, 0, 11),
  knowledge_door: new THREE.Vector3(-6, 0, 5),
  knowledge_center: new THREE.Vector3(-11.5, 0, 10),
  ceo_door: new THREE.Vector3(15, 0, -2),
  ceo_center: new THREE.Vector3(15, 0, -10)
};

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
    path.unshift(WAYPOINTS[current]);
    current = parent[current];
  }
  return path;
}

export function getClosestWaypoint(pos: THREE.Vector3): string {
  let closestWaypoint = 'office_center';
  let minDist = Infinity;
  Object.entries(WAYPOINTS).forEach(([key, p]) => {
    const d = pos.distanceTo(p);
    if (d < minDist) { minDist = d; closestWaypoint = key; }
  });
  return closestWaypoint;
}