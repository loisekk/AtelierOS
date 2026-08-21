import * as THREE from 'three';
import type { Catalog } from '../ai-agents/types';
import { createAgentAvatar } from './factories/avatars';

const oakMat = new THREE.MeshStandardMaterial({ color: 0xE0CDA9, roughness: 0.8 });
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.4, metalness: 0.6 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x8A8A8A, roughness: 0.3, metalness: 0.9 });
const screenBaseMat = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, roughness: 0.2, metalness: 0.5 });
const fabricMat = new THREE.MeshStandardMaterial({ color: 0x4A4A4A, roughness: 1.0 });
const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x5A4030, roughness: 0.55, metalness: 0.15 });
const tableMat = new THREE.MeshStandardMaterial({ color: 0x9A6B48, roughness: 0.6 });
const screenGlowMat = new THREE.MeshStandardMaterial({ color: 0x07131A, emissive: 0x5FE7F2, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.4 });
const bookMats = [0x7A4636, 0x5A3B2B, 0x6E4A3A, 0x4F5B43, 0x8A6245].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
const greenMats = [0x2F5B3A, 0x3F744A, 0x5C8B57].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));

const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
};
const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), mat); m.position.set(x, y, z); m.castShadow = true; return m;
};

function mkChair(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.5, 0.08, 0.5, fabricMat, 0, 0.45, 0));
  g.add(box(0.5, 0.6, 0.06, fabricMat, 0, 0.75, 0.22));
  g.add(cyl(0.03, 0.03, 0.4, metalMat, 0, 0.25, 0));
  g.add(cyl(0.2, 0.2, 0.04, metalMat, 0, 0.06, 0));
  return g;
}

function mkMonitor(x: number, dynamic: boolean, type: 'terminal' | 'status') {
  const g = new THREE.Group();
  g.add(cyl(0.02, 0.02, 0.2, metalMat, x, 0.72, -0.2));
  const s = box(0.6, 0.35, 0.02, dynamic ? screenBaseMat.clone() : screenGlowMat, x, 0.99, -0.2);
  if (dynamic) { s.userData.isScreen = true; s.userData.screenType = type; }
  g.add(s);
  g.add(box(0.62, 0.37, 0.01, darkMat, x, 0.99, -0.205));
  return g;
}

function mkPlant(scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.22 * scale, 0.18 * scale, 0.35 * scale, whiteMat, 0, 0.175 * scale, 0));
  const l1 = new THREE.Mesh(new THREE.ConeGeometry(0.2 * scale, 0.5 * scale, 8), greenMats[0]); l1.position.y = 0.6 * scale; l1.castShadow = true; g.add(l1);
  const l2 = new THREE.Mesh(new THREE.ConeGeometry(0.15 * scale, 0.4 * scale, 8), greenMats[1]); l2.position.set(0.05 * scale, 0.5 * scale, 0.05 * scale); g.add(l2);
  return g;
}

function mkDeskBody(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.8, 0.6, 0.8, oakMat, 0, 0.3, 0));
  g.add(box(1.82, 0.04, 0.82, whiteMat, 0, 0.62, 0));
  [[-0.82, -0.32], [0.82, -0.32], [-0.82, 0.32], [0.82, 0.32]].forEach(([x, z]) => g.add(box(0.05, 0.6, 0.05, metalMat, x, 0.3, z)));
  g.add(box(0.5, 0.02, 0.15, darkMat, 0, 0.65, 0.1));
  return g;
}

export const ITEM_CATALOG: Catalog = {
  frontend_desk: {
    name: 'Frontend Engineer', icon: 'fa-code', price: 0, seats: 0, dim: [2.0, 1.2], role: 'Frontend',
    factory: (bc) => {
      const g = mkDeskBody(); g.add(mkMonitor(-0.35, true, 'terminal')); g.add(mkMonitor(0.35, true, 'status'));
      const ch = mkChair(); ch.position.z = 0.45; g.add(ch);
      const avatar = createAgentAvatar(bc); avatar.position.set(0, 0.49, 0.4); g.add(avatar);
      return g;
    }
  },
  backend_desk: { name: 'Backend Engineer', icon: 'fa-server', price: 0, seats: 0, dim: [2.0, 1.2], role: 'Backend', factory: (bc) => ITEM_CATALOG.frontend_desk.factory(bc) },
  qa_desk: { name: 'QA Engineer', icon: 'fa-bug', price: 0, seats: 0, dim: [2.0, 1.2], role: 'QA', factory: (bc) => ITEM_CATALOG.frontend_desk.factory(bc) },

  workstation_set: {
    name: 'Workstation', icon: 'fa-desktop', price: 950, seats: 1, dim: [2.0, 1.2],
    factory: () => {
      const g = mkDeskBody(); g.add(mkMonitor(-0.35, true, 'terminal')); g.add(mkMonitor(0.35, true, 'status'));
      const ch = mkChair(); ch.position.z = 0.45; g.add(ch);
      return g;
    }
  },
  conference_table: {
    name: 'Conference Table', icon: 'fa-table', price: 2400, seats: 6, dim: [3.4, 2.4],
    factory: () => {
      const g = new THREE.Group();
      g.add(box(3.2, 0.06, 1.4, whiteMat, 0, 0.74, 0));
      [[-1.4, -0.55], [1.4, -0.55], [-1.4, 0.55], [1.4, 0.55]].forEach(([x, z]) => g.add(box(0.06, 0.74, 0.06, oakMat, x, 0.37, z)));
      const ch = (x: number, z: number, ry: number) => { const c = mkChair(); c.position.set(x, 0, z); c.rotation.y = ry; return c; };
      g.add(ch(-1.1, -1.1, Math.PI), ch(0, -1.1, Math.PI), ch(1.1, -1.1, Math.PI));
      g.add(ch(-1.1, 1.1, 0), ch(0, 1.1, 0), ch(1.1, 1.1, 0));
      return g;
    }
  },
  bookshelf_large: {
    name: 'Library Bookshelf', icon: 'fa-book', price: 680, seats: 0, dim: [1.9, 0.4],
    factory: () => {
      const g = new THREE.Group();
      [-0.92, 0.92].forEach(x => g.add(box(0.06, 2.2, 0.35, woodDarkMat, x, 1.1, 0)));
      [0.25, 0.7, 1.15, 1.6, 2.05].forEach(y => g.add(box(1.8, 0.04, 0.32, woodDarkMat, 0, y, 0)));
      [0.45, 0.9, 1.35, 1.8].forEach((y, row) => {
        for (let i = 0; i < 7; i++) { g.add(box(0.14, 0.3, 0.22, bookMats[(i + row) % bookMats.length], -0.72 + i * 0.24, y + 0.17, 0)); }
      });
      return g;
    }
  },
  reading_table: {
    name: 'Reading Table', icon: 'fa-circle', price: 420, seats: 2, dim: [1.6, 1.6],
    factory: () => {
      const g = new THREE.Group();
      g.add(cyl(0.7, 0.7, 0.05, tableMat, 0, 0.74, 0)); g.add(cyl(0.06, 0.08, 0.72, metalMat, 0, 0.36, 0));
      const c1 = mkChair(); c1.position.set(0, 0, -1.0); c1.rotation.y = Math.PI; g.add(c1);
      const c2 = mkChair(); c2.position.set(0, 0, 1.0); g.add(c2);
      return g;
    }
  },
  lounge_sofa: {
    name: 'Lounge Sofa', icon: 'fa-couch', price: 1450, seats: 3, dim: [2.4, 1.0],
    factory: () => {
      const g = new THREE.Group();
      g.add(box(2.2, 0.4, 0.9, fabricMat, 0, 0.25, 0)); g.add(box(2.2, 0.55, 0.25, fabricMat, 0, 0.65, -0.35));
      [-1.1, 1.1].forEach(x => g.add(box(0.22, 0.55, 0.9, fabricMat, x, 0.5, 0)));
      return g;
    }
  },
  lounge_chair: {
    name: 'Accent Chair', icon: 'fa-chair', price: 520, seats: 1, dim: [1.1, 1.0],
    factory: () => {
      const g = new THREE.Group();
      g.add(box(0.9, 0.4, 0.85, fabricMat, 0, 0.25, 0)); g.add(box(0.9, 0.55, 0.22, fabricMat, 0, 0.65, -0.32));
      return g;
    }
  },
  coffee_table: {
    name: 'Coffee Table', icon: 'fa-circle-dot', price: 260, seats: 0, dim: [1.2, 1.2],
    factory: () => {
      const g = new THREE.Group(); g.add(cyl(0.6, 0.6, 0.05, woodDarkMat, 0, 0.4, 0)); g.add(cyl(0.05, 0.07, 0.38, metalMat, 0, 0.2, 0));
      return g;
    }
  },
  reception_desk: {
    name: 'Reception Desk', icon: 'fa-bell-concierge', price: 1900, seats: 1, dim: [3.6, 1.9],
    factory: () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.05, 24, 1, true, Math.PI * 0.15, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: 0x5A4030, roughness: 0.55, side: THREE.DoubleSide }));
      body.position.y = 0.52; body.castShadow = true; g.add(body);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.05, 24, 1, true, Math.PI * 0.13, Math.PI * 0.74), whiteMat);
      top.position.y = 1.07; g.add(top);
      return g;
    }
  },
  waiting_bench: {
    name: 'Waiting Bench', icon: 'fa-bench-tree', price: 380, seats: 3, dim: [2.0, 0.6],
    factory: () => {
      const g = new THREE.Group();
      g.add(box(2, 0.08, 0.5, tableMat, 0, 0.45, 0)); g.add(box(2, 0.5, 0.06, tableMat, 0, 0.75, -0.25));
      [-0.9, 0.9].forEach(x => g.add(box(0.06, 0.45, 0.45, metalMat, x, 0.22, 0)));
      return g;
    }
  },
  command_console: {
    name: 'Command Console', icon: 'fa-gauge-high', price: 3200, seats: 3, dim: [4.4, 1.6],
    factory: () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.75, 24, 1, true, Math.PI * 0.2, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: 0x413730, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }));
      body.position.y = 0.37; body.castShadow = true; g.add(body);
      [-0.5, 0, 0.5].forEach(a => { const m = mkMonitor(Math.sin(a) * 1.6, true, 'status'); m.position.z = -Math.cos(a) * 1.6 + 1.2; m.rotation.y = -a; g.add(m); });
      return g;
    }
  },
  wall_screen: {
    name: 'Wall Display', icon: 'fa-tv', price: 1200, seats: 0, dim: [4.2, 0.2],
    factory: () => {
      const g = new THREE.Group();
      g.add(box(4.2, 2.4, 0.08, darkMat, 0, 1.7, 0)); const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.2), screenGlowMat); scr.position.set(0, 1.7, 0.05); g.add(scr);
      return g;
    }
  },
  archive_server: {
    name: 'Memory Server', icon: 'fa-server', price: 2800, seats: 0, dim: [0.9, 0.7],
    factory: () => {
      const g = new THREE.Group(); g.add(box(0.8, 2, 0.6, darkMat, 0, 1, 0));
      [0.4, 0.8, 1.2, 1.6].forEach(y => g.add(box(0.6, 0.03, 0.02, screenGlowMat, 0, y, 0.31)));
      return g;
    }
  },
  plant_large: { name: 'Large Planter', icon: 'fa-seedling', price: 140, seats: 0, dim: [0.8, 0.8], factory: () => mkPlant(1.8) },

  // Legacy / Customization Mode Items
  round_table: { name: 'Round Table', icon: 'fa-circle', price: 480, seats: 0, dim: [1.2, 1.2], factory: () => { const g = new THREE.Group(); g.add(cyl(0.55, 0.55, 0.04, oakMat, 0, 0.74, 0)); g.add(cyl(0.06, 0.08, 0.74, metalMat, 0, 0.37, 0)); g.add(cyl(0.3, 0.3, 0.03, darkMat, 0, 0.015, 0)); return g; } },
  rect_table: { name: 'Rectangle Table', icon: 'fa-table-cells', price: 620, seats: 0, dim: [1.7, 0.9], factory: () => { const g = new THREE.Group(); g.add(box(1.6, 0.04, 0.85, whiteMat, 0, 0.74, 0)); [[-0.72, -0.35], [0.72, -0.35], [-0.72, 0.35], [0.72, 0.35]].forEach(([x, z]) => g.add(box(0.05, 0.74, 0.05, oakMat, x, 0.37, z))); return g; } },
  chair: { name: 'Dining Chair', icon: 'fa-chair', price: 95, seats: 1, dim: [0.45, 0.45], factory: () => mkChair() },
  counter: { name: 'Service Counter', icon: 'fa-mug-saucer', price: 3800, seats: 0, dim: [3.1, 0.8], factory: (bc) => { const g = new THREE.Group(); g.add(box(3.0, 0.95, 0.7, oakMat, 0, 0.475, 0)); g.add(box(3.0, 0.05, 0.8, whiteMat, 0, 0.975, 0)); const s = box(3.0, 0.02, 0.02, new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 0.5 }), 0, 0.7, 0.36); s.userData.brand = true; g.add(s); return g; } },
  espresso_machine: { name: 'Espresso Machine', icon: 'fa-mug-hot', price: 2400, seats: 0, dim: [0.8, 0.6], factory: (bc) => { const g = new THREE.Group(); g.add(box(0.7, 0.5, 0.45, metalMat, 0, 1.05, 0)); g.add(box(0.7, 0.1, 0.45, darkMat, 0, 1.35, 0)); const s = box(0.1, 0.1, 0.05, new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 0.3 }), 0, 0.85, 0.22); s.userData.brand = true; g.add(s); g.add(cyl(0.08, 0.06, 0.1, whiteMat, 0, 0.8, 0.22)); return g; } },
  retail_rack: { name: 'Retail Rack', icon: 'fa-shirt', price: 320, seats: 0, dim: [1.2, 0.4], factory: () => { const g = new THREE.Group(); [[-0.55, -0.15], [0.55, -0.15], [-0.55, 0.15], [0.55, 0.15]].forEach(([x, z]) => g.add(cyl(0.02, 0.02, 1.8, metalMat, x, 0.9, z))); [0.3, 0.9, 1.5].forEach(y => g.add(box(1.1, 0.03, 0.3, oakMat, 0, y, 0))); return g; } },
  plant: { name: 'Planter', icon: 'fa-seedling', price: 85, seats: 0, dim: [0.5, 0.5], factory: () => mkPlant(1) },
  pendant: { name: 'Pendant Light', icon: 'fa-lightbulb', price: 165, seats: 0, dim: [0.4, 0.4], factory: (bc) => { const g = new THREE.Group(); g.add(cyl(0.01, 0.01, 1.7, darkMat, 0, 1.15, 0)); const s = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.28, 18, 1, true), new THREE.MeshStandardMaterial({ color: bc, metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide })); s.position.y = 2.0; s.userData.brand = true; g.add(s); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e6, emissiveIntensity: 1.5 }))); g.add(new THREE.PointLight(0xfff4e6, 0.5, 3)); return g; } }
};