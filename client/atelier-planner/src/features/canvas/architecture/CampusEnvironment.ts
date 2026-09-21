import * as THREE from 'three';

/** Deterministic seeded RNG — campus never re-shuffles between loads. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; // critical — otherwise all canvas colors wash out
  return tex;
}

export interface CampusEnvironment { dispose(): void; }

/**
 * Warm backdrop — turntable edition. Paints the procedural gradient
 * IMMEDIATELY (no black flash on pre-GLB frames), then streams in the
 * generated equirect panorama (public/textures/atelier-panorama.jpg —
 * 2:1, horizon-centered, warm #E8C08D/#D9A06B/#8A644C haze grade, edges
 * seam-blended) and swaps scene.background once decoded.
 *
 * Background ONLY — the PMREM RoomEnvironment stays the env probe
 * (AtelierEngine), so reflections keep their neutral studio character
 * and the glass never mirrors the panorama's bright horizon band.
 *
 * Background pinning (turntable B+): 'simple' option — an equirect
 * scene.background renders camera-centered, so on the ±70° orbit rail
 * the composition barely shifts. No billboard plane needed.
 * Fog color = horizon color → the campus ground dissolves into the haze.
 */
export function setupSky(scene: THREE.Scene): void {
  const sky = canvasTexture(16, 256, ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.00, '#3E3550'); // zenith — dusk violet
    g.addColorStop(0.45, '#8A644C'); // mid — brand brown
    g.addColorStop(0.75, '#D9A06B'); // horizon — golden glow
    g.addColorStop(1.00, '#E8C08D'); // base — warm light
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 256);
  });
  sky.mapping = THREE.EquirectangularReflectionMapping; // 360° backdrop, not a flat card
  scene.background = sky;

  new THREE.TextureLoader().load(
    '/textures/atelier-panorama.jpg',
    tex => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace; // JPEG is sRGB — critical, else it washes out
      scene.background = tex;
      sky.dispose(); // fallback gradient no longer needed
    },
    undefined,
    () => console.warn('🖼️ atelier-panorama.jpg failed to load — procedural gradient sky stays.'),
  );

  scene.fog = new THREE.Fog(0xD9A06B, 95, 190); // energy fix: near pushed past the building (was 60) — no more haze wash on zoom-out
}

/**
 * Phase 13 H3/I1/I3 — the world around the building: grass campus, seeded
 * instanced trees, entrance walkway (+X front — the reception gate faces east
 * per the v1.3 zone table), emissive path lights (PostFX bloom glows them —
 * zero new PointLights), and a contact shadow grounding the building.
 * Needs the LOADED building for its bbox, hence it runs in the GLB .then().
 * Self-disposing: remove the group, dispose geometries/materials/textures.
 */
export function setupCampus(scene: THREE.Scene, building: THREE.Object3D): CampusEnvironment {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'campus';
  scene.add(group);
  const track = (o: THREE.Object3D) => group.add(o);
  const bBox = new THREE.Box3().setFromObject(building);
  const bSize = bBox.getSize(new THREE.Vector3());
  const GROUND_Y = -1.0; // campus ground plane (the plinth slab bottom = -1)

  // ── H3: Grass ground disc (radial gradient: lush center → dry warm edge) ──
  const groundTex = canvasTexture(512, 512, ctx => {
    const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
    g.addColorStop(0, '#5C7A4A'); g.addColorStop(0.55, '#7A8352'); g.addColorStop(1, '#9A8B5A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  });
  disposables.push(groundTex);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(70, 48),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1.0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y - 0.02; // just under the plinth slab
  ground.receiveShadow = true;
  track(ground);

  // ── H3: Seeded instanced trees on a ring, entrance axis kept clear ──
  const rng = mulberry32(1337);
  const TREE_COUNT = 26;
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.7, 6);
  const coneLowGeo = new THREE.ConeGeometry(1.15, 2.2, 7);
  const coneTopGeo = new THREE.ConeGeometry(0.85, 1.8, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4A33, roughness: 0.95 });
  // White base color — the per-instance leaf tints carry the actual hue
  // (material.color multiplies into instanceColor, so a colored base would
  // double-darken the foliage).
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
  const leavesLow = new THREE.InstancedMesh(coneLowGeo, leafMat, TREE_COUNT);
  const leavesTop = new THREE.InstancedMesh(coneTopGeo, leafMat.clone(), TREE_COUNT);
  trunks.castShadow = leavesLow.castShadow = leavesTop.castShadow = true;
  leavesLow.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const leafTints = [0x4E6B3C, 0x5C7A4A, 0x6E8B52, 0x43683E].map(c => new THREE.Color(c));
  let placed = 0, guard = 0;
  while (placed < TREE_COUNT && guard++ < 400) {
    const angle = rng() * Math.PI * 2;
    const radius = 36 + rng() * 24; // 36…60 — clears the scaled plinth (±27.5 × ±18.5)
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Keep the golden-hour entrance walkway (+X axis) clear for path lights.
    if (x > 24 && Math.abs(z) < 10) continue;
    const s = 0.85 + rng() * 0.8;
    q.setFromAxisAngle(up, rng() * Math.PI * 2);
    const baseY = GROUND_Y + 1.7 * 0.5 * s;
    m.compose(new THREE.Vector3(x, baseY, z), q, new THREE.Vector3(s, s, s));
    trunks.setMatrixAt(placed, m);
    m.compose(new THREE.Vector3(x, baseY + 1.9 * s, z), q, new THREE.Vector3(s, s, s));
    leavesLow.setMatrixAt(placed, m);
    m.compose(new THREE.Vector3(x, baseY + 3.1 * s, z), q, new THREE.Vector3(s, s, s));
    leavesTop.setMatrixAt(placed, m);
    leavesLow.setColorAt(placed, leafTints[placed % leafTints.length]);
    leavesTop.setColorAt(placed, leafTints[(placed + 1) % leafTints.length]);
    placed++;
  }
  trunks.count = leavesLow.count = leavesTop.count = placed;
  [trunks, leavesLow, leavesTop].forEach(mesh => { track(mesh); disposables.push(mesh); });

  // ── I3: Entrance walkway (warm stone tiles, +X front toward the gate) ──
  // The scaled plinth spans ±27.5 × ±18.5 — the strip runs from the plinth
  // edge outward along +X, level with the campus ground.
  const walkTex = canvasTexture(256, 256, ctx => {
    ctx.fillStyle = '#B8A98F'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#A3937A'; ctx.fillRect(0, 0, 128, 128); ctx.fillRect(128, 128, 128, 128);
    ctx.strokeStyle = '#8C7D66'; ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 256, 256); ctx.beginPath();
    ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke();
  });
  walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
  walkTex.repeat.set(9, 2); // u runs along the 24-unit length
  disposables.push(walkTex);
  const walk = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 3.4), // length along X — no extra Z-rotation needed
    new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.85 }),
  );
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(27.5 + 12, GROUND_Y + 0.02, 0);
  walk.receiveShadow = true;
  track(walk);

  // ── I3: Path lights along the walkway — EMISSIVE ONLY (bloom glows them,
  // zero PointLights). Flank the strip from the gate outward.
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2E2620, roughness: 0.6, metalness: 0.4 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xFFF2DE, emissive: 0xFFD9A0, emissiveIntensity: 2.2, roughness: 0.4 });
  for (let i = 0; i < 5; i++) {
    const x = 29.5 + i * 4.5;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 6), postMat);
      post.position.set(x, GROUND_Y + 0.55, side * 2.4);
      post.castShadow = true; track(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), lampMat);
      lamp.position.set(x, GROUND_Y + 1.18, side * 2.4); track(lamp);
    }
  }

  // ── I1: Contact shadow — soft radial gradient grounding the building ──
  const shadowTex = canvasTexture(256, 256, ctx => {
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 126);
    g.addColorStop(0, 'rgba(30, 18, 10, 0.42)'); g.addColorStop(0.6, 'rgba(30, 18, 10, 0.18)'); g.addColorStop(1, 'rgba(30, 18, 10, 0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  });
  disposables.push(shadowTex);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(bSize.x + 21, bSize.z + 19),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.02;
  contact.renderOrder = 1;
  track(contact);

  return {
    dispose() {
      scene.remove(group);
      group.traverse(o => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat?.map?.dispose(); // canvas textures (grass, walkway, shadow)
          mat?.dispose();
        }
      });
      disposables.forEach(d => d.dispose());
    },
  };
}