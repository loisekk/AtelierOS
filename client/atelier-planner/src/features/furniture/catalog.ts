import * as THREE from 'three';
import type { Catalog } from '../ai-agents/types';
import { createAgentAvatar } from './factories/avatars';

// Premium Architectural Materials
const oakMat = new THREE.MeshStandardMaterial({ color: 0xE0CDA9, roughness: 0.8, metalness: 0.0 });
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9, metalness: 0.0 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.4, metalness: 0.6 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x8A8A8A, roughness: 0.3, metalness: 0.9 });
const screenBaseMat = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, roughness: 0.2, metalness: 0.5 });
const fabricMat = new THREE.MeshStandardMaterial({ color: 0x4A4A4A, roughness: 1.0, metalness: 0.0 });

export const ITEM_CATALOG: Catalog = {
  // --- AI EMPLOYEES (Premium Workstations) ---
  frontend_desk: {
    name: 'Frontend Engineer', icon: 'fa-code', price: 0, seats: 0, dim: [2.0, 1.2], role: 'Frontend',
    factory: (bc) => {
      const g = new THREE.Group();
      
      // Desk Surface (White Plaster) & Body (Oak)
      const deskBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.8), oakMat);
      deskBody.position.y = 0.3; deskBody.castShadow = true; deskBody.receiveShadow = true; g.add(deskBody);
      
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.04, 0.82), whiteMat);
      deskTop.position.y = 0.62; deskTop.castShadow = true; g.add(deskTop);

      // Brushed Steel Legs
      [[-0.82, -0.32], [0.82, -0.32], [-0.82, 0.32], [0.82, 0.32]].forEach(([x,z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), metalMat);
        leg.position.set(x, 0.3, z); leg.castShadow = true; g.add(leg);
      });
      
      // Dual Monitors (Sleek Dark Bezels)
      [-0.35, 0.35].forEach((x, i) => {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), metalMat);
        stand.position.set(x, 0.72, -0.2); g.add(stand);
        
        const mat = screenBaseMat.clone();
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.02), mat);
        screen.position.set(x, 0.99, -0.2); 
        screen.userData.isScreen = true;
        screen.userData.screenType = i === 0 ? 'terminal' : 'status';
        g.add(screen);
        
        const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.37, 0.01), darkMat);
        bezel.position.set(x, 0.99, -0.205); g.add(bezel);
      });
      
      // Keyboard
      const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.15), darkMat);
      keyboard.position.set(0, 0.65, 0.1); g.add(keyboard);

      // Premium Office Chair (Fabric & Oak)
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), fabricMat);
      seat.position.set(0, 0.45, 0.4); g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), fabricMat);
      back.position.set(0, 0.75, 0.62); back.rotation.x = -0.1; g.add(back);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), metalMat);
      pole.position.set(0, 0.25, 0.4); g.add(pole);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), metalMat);
      base.position.set(0, 0.06, 0.4); g.add(base);
      
      // Avatar (Employee)
      const avatar = createAgentAvatar(bc);
      avatar.position.set(0, 0.49, 0.4);
      g.add(avatar);

      return g;
    }
  },
  backend_desk: {
    name: 'Backend Engineer', icon: 'fa-server', price: 0, seats: 0, dim: [2.0, 1.2], role: 'Backend',
    factory: (bc) => ITEM_CATALOG.frontend_desk.factory(bc)
  },
  qa_desk: {
    name: 'QA Engineer', icon: 'fa-bug', price: 0, seats: 0, dim: [2.0, 1.2], role: 'QA',
    factory: (bc) => ITEM_CATALOG.frontend_desk.factory(bc)
  },

  // --- FURNITURE (Café & Boutique Mode) ---
  round_table: {
    name: 'Round Table', icon: 'fa-circle', price: 480, seats: 0, dim: [1.2, 1.2],
    factory: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32), oakMat);
      top.position.y = 0.74; top.castShadow = true; top.receiveShadow = true; g.add(top);
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.74, 12), metalMat);
      pedestal.position.y = 0.37; pedestal.castShadow = true; g.add(pedestal);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), darkMat);
      base.position.y = 0.015; base.castShadow = true; g.add(base);
      return g;
    }
  },
  rect_table: {
    name: 'Rectangle Table', icon: 'fa-table-cells', price: 620, seats: 0, dim: [1.7, 0.9],
    factory: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.85), whiteMat);
      top.position.y = 0.74; top.castShadow = true; top.receiveShadow = true; g.add(top);
      [[-0.72, -0.35], [0.72, -0.35], [-0.72, 0.35], [0.72, 0.35]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.05), oakMat);
        leg.position.set(x, 0.37, z); leg.castShadow = true; g.add(leg);
      });
      return g;
    }
  },
  chair: {
    name: 'Dining Chair', icon: 'fa-chair', price: 95, seats: 1, dim: [0.45, 0.45],
    factory: () => {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), fabricMat);
      seat.position.y = 0.45; seat.castShadow = true; seat.receiveShadow = true; g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.04), oakMat);
      back.position.set(0, 0.7, -0.18); back.castShadow = true; g.add(back);
      const legGeom = new THREE.BoxGeometry(0.04, 0.45, 0.04);
      [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeom, oakMat); leg.position.set(x, 0.225, z); leg.castShadow = true; g.add(leg);
      });
      return g;
    }
  },
  stool: {
    name: 'Bar Stool', icon: 'fa-circle-half-stroke', price: 110, seats: 1, dim: [0.4, 0.4],
    factory: (bc) => {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), oakMat);
      seat.position.y = 0.65; seat.castShadow = true; g.add(seat);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 10), metalMat);
      post.position.y = 0.325; post.castShadow = true; g.add(post);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.03, 14), darkMat);
      base.position.y = 0.015; base.castShadow = true; g.add(base);
      // Brand colored footrest
      const rest = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 8, 16), new THREE.MeshStandardMaterial({ color: bc, metalness: 0.8, roughness: 0.2 }));
      rest.position.y = 0.25; rest.rotation.x = Math.PI / 2; rest.userData.brand = true; g.add(rest);
      return g;
    }
  },
  counter: {
    name: 'Service Counter', icon: 'fa-mug-saucer', price: 3800, seats: 0, dim: [3.1, 0.8],
    factory: (bc) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.95, 0.7), oakMat);
      body.position.y = 0.475; body.castShadow = true; g.add(body);
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.05, 0.8), whiteMat);
      top.position.y = 0.975; top.castShadow = true; g.add(top);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 0.5 }));
      strip.position.set(0, 0.7, 0.36); strip.userData.brand = true; g.add(strip);
      return g;
    }
  },
  espresso_machine: {
    name: 'Espresso Machine', icon: 'fa-mug-hot', price: 2400, seats: 0, dim: [0.8, 0.6],
    factory: (bc) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.45), metalMat);
      body.position.set(0, 1.05, 0); body.castShadow = true; g.add(body);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.45), darkMat);
      top.position.set(0, 1.35, 0); g.add(top);
      // Brand colored spout
      const spout = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 0.3 }));
      spout.position.set(0, 0.85, 0.22); spout.userData.brand = true; g.add(spout);
      // Cup
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.1, 12), whiteMat);
      cup.position.set(0, 0.8, 0.22); g.add(cup);
      return g;
    }
  },
  retail_rack: {
    name: 'Retail Rack', icon: 'fa-shirt', price: 320, seats: 0, dim: [1.2, 0.4],
    factory: () => {
      const g = new THREE.Group();
      const poles = [[-0.55, -0.15], [0.55, -0.15], [-0.55, 0.15], [0.55, 0.15]];
      poles.forEach(([x, z]) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8), metalMat);
        p.position.set(x, 0.9, z); p.castShadow = true; g.add(p);
      });
      // Shelves
      [0.3, 0.9, 1.5].forEach(y => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.3), oakMat);
        shelf.position.set(0, y, 0); shelf.castShadow = true; g.add(shelf);
      });
      return g;
    }
  },
  plant: {
    name: 'Planter', icon: 'fa-seedling', price: 85, seats: 0, dim: [0.5, 0.5],
    factory: () => {
      const g = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.35, 16), whiteMat);
      pot.position.y = 0.175; pot.castShadow = true; g.add(pot);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 }));
      leaves.position.y = 0.6; leaves.castShadow = true; g.add(leaves);
      const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 }));
      leaves2.position.set(0.05, 0.5, 0.05); g.add(leaves2);
      return g;
    }
  },
  pendant: {
    name: 'Pendant Light', icon: 'fa-lightbulb', price: 165, seats: 0, dim: [0.4, 0.4],
    factory: (bc) => {
      const g = new THREE.Group();
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.7, 6), darkMat);
      cord.position.y = 1.15; g.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.28, 18, 1, true), new THREE.MeshStandardMaterial({ color: bc, metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide }));
      shade.position.y = 2.0; shade.userData.brand = true; g.add(shade);
      // Light bulb
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e6, emissiveIntensity: 1.5 }));
      bulb.position.y = 1.9; g.add(bulb);
      const light = new THREE.PointLight(0xfff4e6, 0.5, 3);
      light.position.y = 1.8; g.add(light);
      return g;
    }
  },
};