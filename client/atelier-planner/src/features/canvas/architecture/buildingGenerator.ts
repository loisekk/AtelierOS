import * as THREE from 'three';

// Premium Light Theme Materials
const wallMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9, metalness: 0.0 });
const glassMat = new THREE.MeshPhysicalMaterial({ 
  color: 0xFFFFFF, transparent: true, opacity: 0.25, roughness: 0.1, 
  transmission: 0.9, side: THREE.DoubleSide, ior: 1.5 
});
const metalMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.4, metalness: 0.8 });
const concreteMat = new THREE.MeshStandardMaterial({ color: 0xE0CDA9, roughness: 0.8, metalness: 0.0 }); // Warm Oak Floor

export interface BuildingElements {
  floor: THREE.Mesh;
  brainLight: THREE.PointLight;
}

export function createBuilding(scene: THREE.Scene): BuildingElements {
  // Base Foundation Slab
  const floor = new THREE.Mesh(new THREE.BoxGeometry(75, 0.5, 45), concreteMat);
  floor.position.set(15, -0.25, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const brainLight = new THREE.PointLight(0x7C3AED, 5, 40);
  brainLight.position.set(15, 5, -15);
  scene.add(brainLight);

  // ==========================================
  // ARCHITECTURAL HELPERS
  // ==========================================
  const createWall = (x: number, z: number, w: number, d: number, h: number = 4) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, h / 2, z);
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);
    // Charcoal Trim at top and bottom
    const trimTop = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), metalMat);
    trimTop.position.set(x, h, z); scene.add(trimTop);
    const trimBot = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), metalMat);
    trimBot.position.set(x, 0.05, z); scene.add(trimBot);
  };

  const createGlassPartition = (x: number, z: number, w: number, d: number, h: number = 3.5) => {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat);
    glass.position.set(x, h / 2, z);
    scene.add(glass);
    // Metal Frame
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), metalMat);
    frameTop.position.set(x, h, z); scene.add(frameTop);
    const frameBot = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), metalMat);
    frameBot.position.set(x, 0.05, z); scene.add(frameBot);
  };

  const createRoom = (x: number, z: number, w: number, d: number, color: number, lightColor: number, lightIntensity: number = 2) => {
    // Raised Floor Platform
    const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), new THREE.MeshStandardMaterial({color: 0xF5F1EA, roughness: 0.9}));
    roomFloor.position.set(x, 0.1, z);
    roomFloor.receiveShadow = true;
    scene.add(roomFloor);

    // Glowing Floor Edges (Perimeter strips)
    const stripMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.8 });
    const stripH = 0.05; const stripY = 0.22; const t = 0.1;
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(w, stripH, t), stripMat); s1.position.set(x, stripY, z + d/2); scene.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(w, stripH, t), stripMat); s2.position.set(x, stripY, z - d/2); scene.add(s2);
    const s3 = new THREE.Mesh(new THREE.BoxGeometry(t, stripH, d), stripMat); s3.position.set(x + w/2, stripY, z); scene.add(s3);
    const s4 = new THREE.Mesh(new THREE.BoxGeometry(t, stripH, d), stripMat); s4.position.set(x - w/2, stripY, z); scene.add(s4);

    // Room Light
    const light = new THREE.PointLight(lightColor, lightIntensity, 30);
    light.position.set(x, 3.5, z);
    scene.add(light);
  };

  const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };

  // ==========================================
  // 1. OUTER ENVELOPE
  // ==========================================
  createWall(15, -20, 75, 0.5);
  createWall(15, 20, 75, 0.5);
  createWall(-22.5, 0, 0.5, 45);
  createWall(52.5, 0, 0.5, 45);

  // ==========================================
  // 2. CENTRAL SPINE & CORRIDORS
  // ==========================================
  createGlassPartition(5, 0, 0.1, 45);
  createGlassPartition(25, 0, 0.1, 45);

  // ==========================================
  // 3. CEO BRAIN CHAMBER
  // ==========================================
  const brainPlatform = addMesh(new THREE.CylinderGeometry(7, 7.5, 0.4, 64), new THREE.MeshStandardMaterial({color: 0x1C1C1C, roughness: 0.2, metalness: 0.5}), 15, 0.2, -15);
  brainPlatform.castShadow = true; brainPlatform.receiveShadow = true;
  addMesh(new THREE.CylinderGeometry(6, 6.5, 0.4, 64), new THREE.MeshStandardMaterial({color: 0x2A2A2A, roughness: 0.3, metalness: 0.5}), 15, 0.1, -15);
  
  const brainGlass = addMesh(new THREE.SphereGeometry(7.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMat, 15, 0.6, -15);
  brainGlass.scale.y = 0.5; 

  createWall(15, -19.5, 20, 0.5, 5);

  // ==========================================
  // 4. LEFT WING
  // ==========================================
  createGlassPartition(-6, -7.5, 35, 0.1);
  createGlassPartition(-6, 7.5, 35, 0.1);
  
  createRoom(-13.5, -15, 15, 15, 0xC75D3F, 0xFFFFFF, 1.5); // Home
  createRoom(-13.5, 0, 15, 15, 0x059669, 0xFFFFFF, 1.5);   // Agent
  createRoom(-13.5, 15, 15, 15, 0x0EA5E9, 0xFFFFFF, 1.5);  // Knowledge

  // Home Workspace Props
  addMesh(new THREE.BoxGeometry(4, 0.1, 1.5), new THREE.MeshStandardMaterial({color: 0x4A4A4A}), -13.5, 0.8, -17).rotation.y = Math.PI / 4;
  addMesh(new THREE.BoxGeometry(2, 0.5, 1.5), new THREE.MeshStandardMaterial({color: 0xECE7DE}), -18, 0.3, -13); // Sofa

  // Agent Space Cubicles
  for(let i=-6; i<=6; i+=6) {
    addMesh(new THREE.BoxGeometry(0.1, 0.8, 2), glassMat, -13.5+i, 0.4, 0);
  }

  // Knowledge Hub Bookshelves
  for(let i=-10; i<=10; i+=5) {
    addMesh(new THREE.BoxGeometry(4, 2.5, 0.4), new THREE.MeshStandardMaterial({color: 0xECE7DE, roughness: 0.8}), i, 1.25, 19.5);
    addMesh(new THREE.BoxGeometry(3.8, 0.05, 0.3), metalMat, i, 1.0, 19.5);
    addMesh(new THREE.BoxGeometry(3.8, 0.05, 0.3), metalMat, i, 1.8, 19.5);
  }
  addMesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32), new THREE.MeshStandardMaterial({color: 0xECE7DE}), -13.5, 0.8, 15);

  // ==========================================
  // 5. RIGHT WING
  // ==========================================
  createGlassPartition(36, -7.5, 35, 0.1);
  createGlassPartition(36, 7.5, 35, 0.1);

  createRoom(36, -15, 15, 15, 0x0EA5E9, 0xFFFFFF, 1.5); // Showcase
  createRoom(36, 0, 15, 15, 0x7C3AED, 0xFFFFFF, 2);   // Office
  createRoom(36, 15, 15, 15, 0xC75D3F, 0xFFFFFF, 1.5); // AI Club

  addMesh(new THREE.BoxGeometry(14, 3, 0.1), new THREE.MeshStandardMaterial({color: 0x1C1C1C, emissive: 0x0EA5E9, emissiveIntensity: 0.4}), 36, 2.5, -19.8);
  
  // Office Floor Plants
  addMesh(new THREE.CylinderGeometry(0.3, 0.2, 0.5, 8), new THREE.MeshStandardMaterial({color: 0x2A2A2A, metalness: 0.8, roughness: 0.4}), 28, 0.25, -4);
  addMesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshStandardMaterial({color: 0x059669, roughness: 0.8}), 28, 0.8, -4);

  // AI Club Sofa
  addMesh(new THREE.BoxGeometry(6, 0.4, 1.5), new THREE.MeshStandardMaterial({color: 0xECE7DE}), 34, 0.3, 15);
  addMesh(new THREE.BoxGeometry(1.5, 0.4, 4), new THREE.MeshStandardMaterial({color: 0xECE7DE}), 31, 0.3, 16);
  addMesh(new THREE.BoxGeometry(4, 0.5, 0.1), new THREE.MeshStandardMaterial({color: 0xC75D3F, emissive: 0xC75D3F, emissiveIntensity: 1.2}), 36, 2.5, 19.8);

  // ==========================================
  // 6. CENTRAL FRONT
  // ==========================================
  createGlassPartition(15, -5, 20, 0.1);
  createRoom(15, -2, 20, 10, 0x0EA5E9, 0xFFFFFF, 2.5); // Command Hub
  addMesh(new THREE.CylinderGeometry(2.5, 2.5, 0.8, 32, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({color: 0x1C1C1C, roughness: 0.1, metalness: 0.9}), 15, 0.5, -2).rotation.y = Math.PI;
  addMesh(new THREE.BoxGeometry(10, 2, 0.1), new THREE.MeshStandardMaterial({color: 0x1C1C1C, emissive: 0x0EA5E9, emissiveIntensity: 0.3}), 15, 2.5, -4.9);

  createGlassPartition(15, 5, 20, 0.1);
  createRoom(15, 10, 20, 10, 0xD97706, 0xFFFFFF, 2); // Meeting Room
  addMesh(new THREE.BoxGeometry(6, 0.1, 2), new THREE.MeshStandardMaterial({color: 0xECE7DE}), 15, 0.8, 10).castShadow = true;
  for(let i=-2; i<=2; i+=2) {
    [-1, 1].forEach(z => {
      addMesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), new THREE.MeshStandardMaterial({color: 0x1C1C1C}), 15 + i, 0.4, 10 + (1.5 * z));
    });
  }
  addMesh(new THREE.BoxGeometry(8, 2.5, 0.1), new THREE.MeshStandardMaterial({color: 0x1C1C1C, emissive: 0xD97706, emissiveIntensity: 0.3}), 15, 2.5, 4.9);

  createGlassPartition(15, 15, 20, 0.1);
  // RECEPTION
  addMesh(new THREE.CylinderGeometry(2, 2, 0.8, 32, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({color: 0xECE7DE, roughness: 0.8}), 15, 0.5, 18).rotation.y = Math.PI;
  addMesh(new THREE.CylinderGeometry(2.1, 2.1, 0.02, 32, 1, false, 0, Math.PI), metalMat, 15, 0.9, 18).rotation.y = Math.PI;
  addMesh(new THREE.BoxGeometry(2, 0.5, 0.1), new THREE.MeshStandardMaterial({color: 0xC75D3F, emissive: 0xC75D3F, emissiveIntensity: 1.0}), 15, 1.3, 18.1);

  return { floor, brainLight };
}