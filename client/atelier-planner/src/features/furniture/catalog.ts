import * as THREE from 'three';
import type { Catalog } from '../ai-agents/types';
import { createAgentAvatar } from './factories/avatars';

// Premium Architectural Materials (shared)
const oakMat = new THREE.MeshStandardMaterial({ color: 0xE0CDA9, roughness: 0.8 });
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.4, metalness: 0.6 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x8A8A8A, roughness: 0.3, metalness: 0.9 });
const fabricMat = new THREE.MeshStandardMaterial({ color: 0x4A4A4A, roughness: 1.0 });
const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x5A4030, roughness: 0.55, metalness: 0.15 });
const tableMat = new THREE.MeshStandardMaterial({ color: 0x9A6B48, roughness: 0.6 });
const screenGlowMat = new THREE.MeshStandardMaterial({ color: 0x07131A, emissive: 0x5FE7F2, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.4 });
const bookMats = [0x7A4636, 0x5A3B2B, 0x6E4A3A, 0x4F5B43, 0x8A6245].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
const greenMats = [0x2F5B3A, 0x3F744A, 0x5C8B57].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));

function mkChair(): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), fabricMat); seat.position.y = 0.45; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), fabricMat); back.position.set(0, 0.75, 0.28); back.rotation.x = -0.1; back.castShadow = true; g.add(back);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), metalMat); pole.position.y = 0.25; g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), metalMat); base.position.y = 0.06; g.add(base);
  return g;
}

function mkMonitor(x: number): THREE.Group {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), metalMat); stand.position.set(x, 0.72, -0.2); g.add(stand);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.02), screenGlowMat.clone()); screen.position.set(x, 0.99, -0.2);
  screen.userData.isScreen = true;
  screen.userData.screenType = 'terminal'; g.add(screen);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.37, 0.01), darkMat); bezel.position.set(x, 0.99, -0.21); g.add(bezel);
  return g;
}

function mkDeskBody(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.8), oakMat); body.position.y = 0.3; body.castShadow = true; g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.04, 0.82), whiteMat); top.position.y = 0.62; top.castShadow = true; g.add(top);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.15), darkMat); kb.position.set(0, 0.65, 0.1); g.add(kb);
  return g;
}

function mkPlant(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.22 * scale, 0.4 * scale, 16), whiteMat); pot.position.y = 0.2 * scale; pot.castShadow = true; g.add(pot);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.5 * scale, 6), woodDarkMat); trunk.position.y = 0.6 * scale; g.add(trunk);
  [0, 1, 2].forEach(i => {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.3 * scale, 0.7 * scale, 8), greenMats[i]);
    leaf.position.set((i - 1) * 0.12 * scale, (1.0 + i * 0.25) * scale, (i - 1) * 0.08 * scale);
    leaf.castShadow = true; g.add(leaf);
  });
  return g;
}

export const ITEM_CATALOG: Catalog = {
  // --- AI EMPLOYEES ---
  frontend_desk: {
    name: 'Frontend Engineer', icon: 'fa-code', price: 0, seats: 0, dim: [2.0, 1.2], role: 'Frontend',
    factory: (bc) => {
      const g = new THREE.Group();
      g.add(mkDeskBody()); g.add(mkMonitor(-0.35)); g.add(mkMonitor(0.35));
      const ch = mkChair(); ch.position.z = 0.45; g.add(ch);
      const avatar = createAgentAvatar(bc); avatar.position.set(0, 0.49, 0.4); g.add(avatar);
      return g;
    }
  },
  backend_desk: { name: 'Backend Engineer', icon: 'fa-server', price: 0, seats: 0, dim: [2.0, 1.2], role: 'Backend', factory: (bc) => ITEM_CATALOG.frontend_desk.factory(bc) },
  qa_desk: { name: 'QA Engineer', icon: 'fa-bug', price: 0, seats: 0, dim: [2.0, 1.2], role: 'QA', factory: (bc) => ITEM_CATALOG.frontend_desk.factory(bc) },

  // --- OFFICE FURNITURE ---
  workstation_set: {
    name: 'Workstation', icon: 'fa-desktop', price: 950, seats: 1, dim: [2.0, 1.2],
    factory: () => {
      const g = new THREE.Group();
      g.add(mkDeskBody()); g.add(mkMonitor(-0.35)); g.add(mkMonitor(0.35));
      const ch = mkChair(); ch.position.z = 0.45; g.add(ch);
      return g;
    }
  },
  conference_table: {
    name: 'Conference Table', icon: 'fa-table', price: 2400, seats: 8, dim: [4.6, 1.7],
    factory: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 1.7), tableMat); top.position.y = 0.74; top.castShadow = true; g.add(top);
      [-2.0, 2.0].forEach(x => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 1.4), woodDarkMat); leg.position.set(x, 0.36, 0); leg.castShadow = true; g.add(leg); });
      [-1.6, -0.55, 0.55, 1.6].forEach(x => {
        const cn = mkChair(); cn.position.set(x, 0, -1.15); cn.rotation.y = Math.PI; g.add(cn);
        const cs = mkChair(); cs.position.set(x, 0, 1.15); g.add(cs);
      });
      return g;
    }
  },
  rect_table: {
    name: 'Office Table', icon: 'fa-table-cells', price: 620, seats: 0, dim: [1.7, 0.9],
    factory: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.85), whiteMat); top.position.y = 0.74; top.castShadow = true; g.add(top);
      [[-0.72, -0.35], [0.72, -0.35], [-0.72, 0.35], [0.72, 0.35]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.05), oakMat); leg.position.set(x, 0.37, z); leg.castShadow = true; g.add(leg);
      });
      return g;
    }
  },
  round_table: {
    name: 'Round Table', icon: 'fa-circle', price: 480, seats: 0, dim: [1.2, 1.2],
    factory: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32), oakMat); top.position.y = 0.74; top.castShadow = true; g.add(top);
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.74, 12), metalMat); pedestal.position.y = 0.37; g.add(pedestal);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), darkMat); base.position.y = 0.015; g.add(base);
      return g;
    }
  },
  chair: { name: 'Office Chair', icon: 'fa-chair', price: 95, seats: 1, dim: [0.45, 0.45], factory: () => mkChair() },
  laptop: {
    name: 'Laptop', icon: 'fa-laptop', price: 180, seats: 0, dim: [0.35, 0.25],
    factory: () => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), darkMat); base.position.y = 0.01; base.castShadow = true; g.add(base);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.015), screenGlowMat); scr.position.set(0, 0.11, -0.12); scr.rotation.x = -0.3; g.add(scr);
      return g;
    }
  },
  wall_screen: {
    name: 'TV Wall Screen', icon: 'fa-tv', price: 1200, seats: 0, dim: [4.2, 0.2],
    factory: () => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 0.08), darkMat); frame.position.y = 1.7; frame.castShadow = true; g.add(frame);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.2), screenGlowMat.clone()); scr.position.set(0, 1.7, 0.05);
      scr.userData.isScreen = true;
      scr.userData.screenType = 'room_board'; g.add(scr);
      return g;
    }
  },
  whiteboard: {
    name: 'Whiteboard', icon: 'fa-chalkboard', price: 240, seats: 0, dim: [1.9, 0.5],
    factory: () => {
      const g = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.04), whiteMat); board.position.y = 1.35; board.castShadow = true; g.add(board);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(1.88, 1.18, 0.02), metalMat); rim.position.set(0, 1.35, -0.03); g.add(rim);
      [-0.8, 0.8].forEach(x => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.35, 8), metalMat); leg.position.set(x, 0.67, -0.05); g.add(leg); });
      return g;
    }
  },
  filing_cabinet: {
    name: 'Filing Cabinet', icon: 'fa-cabinet-filing', price: 310, seats: 0, dim: [0.55, 0.65],
    factory: () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.6), metalMat); body.position.y = 0.6; body.castShadow = true; g.add(body);
      [0.25, 0.6, 0.95].forEach(y => {
        const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.03), darkMat); drawer.position.set(0, y, 0.31); g.add(drawer);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.02), metalMat); handle.position.set(0, y + 0.08, 0.33); g.add(handle);
      });
      return g;
    }
  },
  bookshelf_large: {
    name: 'Library Bookshelf', icon: 'fa-book', price: 680, seats: 0, dim: [1.9, 0.4],
    factory: () => {
      const g = new THREE.Group();
      [-0.92, 0.92].forEach(x => { const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.35), woodDarkMat); side.position.set(x, 1.1, 0); side.castShadow = true; g.add(side); });
      [0.25, 0.7, 1.15, 1.6, 2.05].forEach(y => { const sh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.32), woodDarkMat); sh.position.y = y; g.add(sh); });
      [0.45, 0.9, 1.35, 1.8].forEach((y, row) => {
        for (let i = 0; i < 7; i++) {
          const book = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.22), bookMats[(i + row) % bookMats.length]);
          book.position.set(-0.72 + i * 0.24, y + 0.17, 0); g.add(book);
        }
      });
      return g;
    }
  },
  reading_table: {
    name: 'Reading Table', icon: 'fa-circle-dot', price: 420, seats: 2, dim: [1.6, 1.6],
    factory: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 24), tableMat); top.position.y = 0.74; top.castShadow = true; g.add(top);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.72, 12), metalMat); pole.position.y = 0.36; g.add(pole);
      const c1 = mkChair(); c1.position.set(0, 0, -1.0); c1.rotation.y = Math.PI; g.add(c1);
      const c2 = mkChair(); c2.position.set(0, 0, 1.0); g.add(c2);
      return g;
    }
  },
  lounge_sofa: {
    name: 'Lounge Sofa', icon: 'fa-couch', price: 1450, seats: 3, dim: [2.4, 1.0],
    factory: () => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.9), fabricMat); base.position.y = 0.25; base.castShadow = true; g.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.25), fabricMat); back.position.set(0, 0.65, -0.35); back.castShadow = true; g.add(back);
      [-1.1, 1.1].forEach(x => { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.9), fabricMat); arm.position.set(x, 0.5, 0); arm.castShadow = true; g.add(arm); });
      return g;
    }
  },
  lounge_chair: {
    name: 'Accent Chair', icon: 'fa-chair', price: 520, seats: 1, dim: [1.1, 1.0],
    factory: () => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.85), fabricMat); base.position.y = 0.25; base.castShadow = true; g.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.22), fabricMat); back.position.set(0, 0.65, -0.32); back.castShadow = true; g.add(back);
      return g;
    }
  },
  coffee_table: {
    name: 'Coffee Table', icon: 'fa-circle-dot', price: 260, seats: 0, dim: [1.2, 1.2],
    factory: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24), woodDarkMat); top.position.y = 0.4; top.castShadow = true; g.add(top);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.38, 10), metalMat); pole.position.y = 0.2; g.add(pole);
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
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.5), tableMat); seat.position.y = 0.45; seat.castShadow = true; g.add(seat);
      [-0.9, 0.9].forEach(x => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.45), metalMat); leg.position.set(x, 0.22, 0); g.add(leg); });
      const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.06), tableMat); back.position.set(0, 0.75, -0.25); g.add(back);
      return g;
    }
  },
  command_console: {
    name: 'Command Console', icon: 'fa-gauge-high', price: 3200, seats: 3, dim: [4.4, 1.6],
    factory: () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.75, 24, 1, true, Math.PI * 0.2, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: 0x413730, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }));
      body.position.y = 0.37; body.castShadow = true; g.add(body);
      [-0.5, 0, 0.5].forEach(a => { const m = mkMonitor(Math.sin(a) * 1.6); m.position.z = -Math.cos(a) * 1.6 + 1.2; m.rotation.y = -a; g.add(m); });
      return g;
    }
  },
  archive_server: {
    name: 'Memory Server', icon: 'fa-server', price: 2800, seats: 0, dim: [0.9, 0.7],
    factory: () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.6), darkMat); body.position.y = 1; body.castShadow = true; g.add(body);
      [0.4, 0.8, 1.2, 1.6].forEach(y => { const led = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.02), screenGlowMat); led.position.set(0, y, 0.31); g.add(led); });
      return g;
    }
  },
  plant_large: { name: 'Large Planter', icon: 'fa-seedling', price: 140, seats: 0, dim: [0.8, 0.8], factory: () => mkPlant(1.8) },
  plant: { name: 'Planter', icon: 'fa-seedling', price: 85, seats: 0, dim: [0.5, 0.5], factory: () => mkPlant(1) },
  pendant: {
    name: 'Pendant Light', icon: 'fa-lightbulb', price: 165, seats: 0, dim: [0.4, 0.4],
    factory: (bc) => {
      const g = new THREE.Group();
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.7, 6), darkMat); cord.position.y = 1.15; g.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.28, 18, 1, true), new THREE.MeshStandardMaterial({ color: bc, metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide }));
      shade.position.y = 2.0; shade.userData.brand = true; g.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e6, emissiveIntensity: 1.5 }));
      bulb.position.y = 1.9; g.add(bulb);
      const light = new THREE.PointLight(0xfff4e6, 0.5, 3); light.position.y = 1.8; g.add(light);
      return g;
    }
  },
};