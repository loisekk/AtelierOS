import * as THREE from 'three';

const M = (color: number, rough = 0.85, metal = 0.0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.45, ...extra });

export const AtelierWarmMaterials = {
  wall:      M(0xE6D5C2, 0.92, 0.0, { envMapIntensity: 0.32 }),
  wallDark:  M(0x423329, 0.90, 0.0, { envMapIntensity: 0.28 }),
  floor:     M(0xC7A07D, 0.70, 0.08),
  floorDark: M(0x3E3029, 0.75, 0.08),
  wood:      M(0x9A6F4E, 0.60),
  woodDark:  M(0x654533, 0.65),
  desk:      M(0x5A4030, 0.50, 0.15),
  table:     M(0x9A6B48, 0.55),
  chair:     M(0x403A36, 0.85, 0.05),
  fabric:    M(0x53443D, 0.95),
  metal:     M(0x413730, 0.35, 0.80, { envMapIntensity: 0.9 }),
  glass:     new THREE.MeshPhysicalMaterial({ color: 0xD8DED8, transmission: 0.85, transparent: true, opacity: 0.35, roughness: 0.12, ior: 1.5, envMapIntensity: 0.8, side: THREE.DoubleSide }),
  screen:    M(0x07131A, 0.25, 0.40, { emissive: 0x5FE7F2, emissiveIntensity: 0.9, envMapIntensity: 0.6 }),
  brain:     M(0x7F5BB2, 0.30, 0.40, { emissive: 0xA75FFF, emissiveIntensity: 1.4, envMapIntensity: 0.7 }),
  plant:     M(0x3F744A, 0.90),
  pot:       M(0x9A684B, 0.75),
  stone:     M(0xD3B79D, 0.88, 0.0, { envMapIntensity: 0.35 }),
  default:   M(0xC7A98D, 0.80),
};

const BOOK_MATS = [0x7A4636, 0x5A3B2B, 0x6E4A3A, 0x4F5B43, 0x8A6245].map(c => M(c, 0.85));

// [castShadow, receiveShadow] per role — glass/screens never cast solid shadows
const SHADOW_POLICY: Record<string, [boolean, boolean]> = {
  glass: [false, false], screen: [false, true], floor: [false, true], floorDark: [false, true],
};

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

function classify(name: string): string | null {
  if (/brain|neuron|neural|core_/.test(name)) return 'brain';
  if (/monitor|screen|display|tv|panel_led|led/.test(name)) return 'screen';
  if (/glass|window/.test(name)) return 'glass';
  if (/plant|leaf|foliage/.test(name)) return 'plant';
  if (/pot|planter/.test(name)) return 'pot';
  if (/book/.test(name)) return 'book';
  if (/sofa|couch|lounge|cushion/.test(name)) return 'fabric';
  if (/chair|seat|stool/.test(name)) return 'chair';
  if (/desk|counter|reception/.test(name)) return 'desk';
  if (/table/.test(name)) return 'table';
  if (/shelf|cabinet|wardrobe|locker/.test(name)) return 'woodDark';
  if (/door/.test(name)) return 'woodDark';
  if (/metal|frame|leg|handle|trim|rail/.test(name)) return 'metal';
  if (/floor|ground|carpet|rug/.test(name)) return 'floor';
  if (/wall|ceiling|column|beam|partition|roof|facade/.test(name)) return 'wall';
  if (/wood|oak|walnut/.test(name)) return 'wood';
  return null;
}

export function applyMaterialTheme(model: THREE.Object3D) {
  model.updateMatrixWorld(true);

  // Pass 0: locate the Brain chamber so its shell gets the dark treatment
  const acc = new THREE.Vector3(); let n = 0;
  model.traverse(nd => {
    if ((nd as THREE.Mesh).isMesh && /brain|neuron|neural|core_/i.test(nd.name)) { acc.add(new THREE.Vector3().setFromMatrixPosition(nd.matrixWorld)); n++; }
  });
  const brainC = n > 0 ? acc.divideScalar(n) : null;

  let unclassified = 0; const samples: string[] = [];
  const _box = new THREE.Box3(); const _size = new THREE.Vector3(); const _wp = new THREE.Vector3();

  model.traverse(node => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.name || '').toLowerCase();
    let role = classify(name);

    // Geometry heuristics when names are useless (this fixes the "all white" fallback)
    if (!role) {
      _box.setFromObject(mesh); _box.getSize(_size); mesh.getWorldPosition(_wp);
      const flat = _size.y < 0.15 && _size.x * _size.z > 4;
      if (flat && _box.min.y < 0.35) role = 'floor';
      else if (flat && _box.min.y > 1.8) role = 'wall';
      else if (Math.min(_size.x, _size.z) < 0.35 && _size.y > 1.5 && Math.max(_size.x, _size.z) > 2) role = 'wall';
      else if (_size.y < 0.9 && _size.x > 1.2 && _size.z > 0.5 && _wp.y > 0.3 && _wp.y < 0.9) role = 'desk';
    }

    // Brain-chamber zone darkening (area-specific treatment, programmatic)
    if (brainC && (role === 'wall' || role === 'floor')) {
      mesh.getWorldPosition(_wp);
      if (Math.hypot(_wp.x - brainC.x, _wp.z - brainC.z) < 6.5 && _wp.y < 4) role = role === 'wall' ? 'wallDark' : 'floorDark';
    }

    if (!role) {
      role = 'default'; unclassified++;
      if (samples.length < 12 && name) samples.push(name);
    }

    // SHARED material instances — never clone per mesh (draw-call/GC friendly)
    mesh.material = role === 'book' ? BOOK_MATS[hash(mesh.name) % BOOK_MATS.length] : (AtelierWarmMaterials as any)[role];
    const [cast, recv] = SHADOW_POLICY[role] ?? [true, true];
    mesh.castShadow = cast; mesh.receiveShadow = recv;
  });

  console.log(`Material Theme v2 applied. Unclassified: ${unclassified}`, samples.length ? `Rename these meshes for better mapping: ${samples.join(', ')}` : '');
}