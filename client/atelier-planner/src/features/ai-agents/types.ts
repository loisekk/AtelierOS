import * as THREE from 'three';

export type AgentStatus = 'idle' | 'working' | 'waiting' | 'error' | 'walking' | 'celebrate';

export interface AgentConfig {
  name: string;
  harness: string;
  model: string;
  provider: string;
}

export interface PlacedItemMeta {
  id: string;
  type: string;
  name: string;
  price: number;
  seats: number;
  position: { x: number; z: number };
  rotation: number;
  role?: string;
  status?: AgentStatus;
  config?: AgentConfig;
}

export interface CatalogItem {
  name: string;
  icon: string;
  price: number;
  seats: number;
  dim: [number, number];
  factory: (brandColor: string) => THREE.Group;
  role?: string;
}

export type Catalog = Record<string, CatalogItem>;

export interface Task {
  id: string;
  prompt: string;
  assigneeIds: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: number;
}