import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { applyMaterialTheme, AtelierWarmMaterials } from './MaterialTheme';

/**
 * Finds the real interior walking-surface height.
 * After applyMaterialTheme, floor meshes SHARE the exact floor material instance,
 * so we detect them by identity and take the top of the largest slab.
 */
function detectFloorHeight(model: THREE.Object3D): number {
  let bestArea = 0;
  let floorY = 0;
  const box = new THREE.Box3();
  const size = new THREE.Vector3();

  model.traverse(nd => {
    const m = nd as THREE.Mesh;
    if (!m.isMesh) return;
    if (m.material === AtelierWarmMaterials.floor || m.material === AtelierWarmMaterials.floorDark) {
      box.setFromObject(m);
      box.getSize(size);
      const area = size.x * size.z;
      if (area > bestArea) {
        bestArea = area;
        floorY = box.max.y; // top surface = where furniture & agents stand
      }
    }
  });

  return floorY;
}

export async function loadBuildingGLB(url: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        // 1. Apply Scale FIRST
        const originalBox = new THREE.Box3().setFromObject(model);
        const originalSize = originalBox.getSize(new THREE.Vector3());
        const targetWidth = 45;
        const scale = targetWidth / originalSize.x;
        model.scale.setScalar(scale);

        // 2. Recalculate Bounding Box AFTER scaling
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

        // 3. Center (X, Z) and drop to plinth (Y=0)
        model.position.x -= scaledCenter.x;
        model.position.z -= scaledCenter.z;
        model.position.y -= scaledBox.min.y;

        // 4. Apply Warm PBR Material Theme (name classify + bbox fallback)
        applyMaterialTheme(model);

        // 5. Detect the interior floor height for placement & walking
        const floorY = detectFloorHeight(model);
        model.userData.floorY = floorY;
        console.log(`🏗️ Building loaded. Interior floor height: ${floorY.toFixed(3)}`);

        resolve(model);
      },
      undefined,
      (error) => reject(error)
    );
  });
}