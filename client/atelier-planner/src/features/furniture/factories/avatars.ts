import * as THREE from 'three';

export function createAgentAvatar(brandColor: string): THREE.Group {
  const g = new THREE.Group();
  
  // Premium Business Casual Materials
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xE0AC69, roughness: 0.7 }); // Warm natural skin
  const sweaterMat = new THREE.MeshStandardMaterial({ color: 0xF5F1EA, roughness: 0.9 }); // Oatmeal sweater
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.8 }); // Charcoal slacks
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, roughness: 0.4, metalness: 0.1 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x3B2A1A, roughness: 0.8 }); // Dark brown hair
  const glassesMat = new THREE.MeshStandardMaterial({ color: brandColor, metalness: 0.8, roughness: 0.2 });
  
  // Hips
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.3), pantsMat);
  hips.position.y = 0.55;
  hips.castShadow = true;
  g.add(hips);

  // Torso (Sweater)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.3), sweaterMat);
  torso.position.y = 0.85;
  torso.castShadow = true;
  g.add(torso);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.2, 0);
  g.add(headGroup);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.1, 8), skinMat);
  neck.position.y = -0.05;
  headGroup.add(neck);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.22), skinMat);
  head.position.y = 0.1;
  head.castShadow = true;
  headGroup.add(head);

  // Hair
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.24), hairMat);
  hair.position.y = 0.24;
  headGroup.add(hair);

  // Stylish Glasses (instead of cyber visor)
  const glassesFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.02), glassesMat);
  glassesFrame.position.set(0, 0.12, 0.11);
  headGroup.add(glassesFrame);
  
  const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.01), new THREE.MeshStandardMaterial({color: 0x000000, roughness: 0.1, metalness: 0.5}));
  lensL.position.set(-0.06, 0.12, 0.112);
  headGroup.add(lensL);
  
  const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.01), new THREE.MeshStandardMaterial({color: 0x000000, roughness: 0.1, metalness: 0.5}));
  lensR.position.set(0.06, 0.12, 0.112);
  headGroup.add(lensR);

  // Arms (Grouped for animation)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.28, 1.05, 0);
  g.add(leftArm);
  
  const leftUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), sweaterMat);
  leftUpperArm.position.y = -0.15;
  leftUpperArm.castShadow = true;
  leftArm.add(leftUpperArm);

  const leftLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.09), skinMat);
  leftLowerArm.position.y = -0.4;
  leftLowerArm.castShadow = true;
  leftArm.add(leftLowerArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.28, 1.05, 0);
  g.add(rightArm);
  
  const rightUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), sweaterMat);
  rightUpperArm.position.y = -0.15;
  rightUpperArm.castShadow = true;
  rightArm.add(rightUpperArm);

  const rightLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.09), skinMat);
  rightLowerArm.position.y = -0.4;
  rightLowerArm.castShadow = true;
  rightArm.add(rightLowerArm);

  // Legs (Seated Pose - Bent 90 degrees)
  const createLeg = (x: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(x, 0.45, 0);
    
    const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), pantsMat);
    upperLeg.position.y = -0.2;
    upperLeg.castShadow = true;
    legGroup.add(upperLeg);

    // Knee joint
    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -0.4, 0);
    kneeGroup.rotation.x = -Math.PI / 2; // Bend forward
    legGroup.add(kneeGroup);

    const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.14), pantsMat);
    lowerLeg.position.y = -0.2;
    lowerLeg.position.z = 0.2; // Shift forward to reach the floor
    lowerLeg.castShadow = true;
    kneeGroup.add(lowerLeg);

    // Shoe
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.25), shoeMat);
    shoe.position.set(0, -0.35, 0.05);
    kneeGroup.add(shoe);

    return legGroup;
  };

  g.add(createLeg(-0.1));
  g.add(createLeg(0.1));

  // Set initial rotation for arms to simulate resting on desk
  leftArm.rotation.x = -1.2;
  rightArm.rotation.x = -1.2;

  // Tag for animation lookup in AtelierEngine
  g.userData.isAvatar = true;
  g.userData.head = headGroup;
  g.userData.leftArm = leftArm;
  g.userData.rightArm = rightArm;

  return g;
}