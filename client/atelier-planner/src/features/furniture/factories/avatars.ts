import * as THREE from 'three';

export function createAgentAvatar(brandColor: string): THREE.Group {
  const g = new THREE.Group();
  
  // Premium Business Casual Materials (upgraded)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xE0AC69, roughness: 0.65 });
  const sweaterMat = new THREE.MeshStandardMaterial({ color: 0xF5F1EA, roughness: 0.92 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, roughness: 0.45, metalness: 0.15 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x3B2A1A, roughness: 0.75 });
  const glassesMat = new THREE.MeshStandardMaterial({ color: brandColor, metalness: 0.85, roughness: 0.18 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.7 });
  
  // ── HIP CENTER (Avatar root = seat surface) ──
  // Hips now at y=0.45 (chair seat height), avatar placed at desk y=0.49
  // So hips end up at 0.49 + 0.45 = 0.94 (correct seated height)
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.32), pantsMat);
  hips.position.y = 0.45;
  hips.castShadow = true;
  g.add(hips);

  // ── TORSO (Sweater with collar detail) ──
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.32), sweaterMat);
  torso.position.y = 0.78;
  torso.castShadow = true;
  g.add(torso);

  // Collar/neck base
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 12), sweaterMat);
  collar.position.y = 1.03;
  g.add(collar);

  // ── HEAD GROUP ──
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.15, 0);
  g.add(headGroup);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 10), skinMat);
  neck.position.y = -0.06;
  headGroup.add(neck);

  // Head (slightly taller for better proportions)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), skinMat);
  head.position.y = 0.12;
  head.castShadow = true;
  headGroup.add(head);

  // Hair (styled, not just a block)
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.26), hairMat);
  hairTop.position.y = 0.27;
  headGroup.add(hairTop);

  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.08), hairMat);
  hairBack.position.set(0, 0.15, -0.11);
  headGroup.add(hairBack);

  const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.2), hairMat);
  hairSideL.position.set(-0.13, 0.16, 0);
  headGroup.add(hairSideL);

  const hairSideR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.2), hairMat);
  hairSideR.position.set(0.13, 0.16, 0);
  headGroup.add(hairSideR);

  // ── GLASSES (modern frame) ──
  const glassesFrame = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.025), glassesMat);
  glassesFrame.position.set(0, 0.14, 0.12);
  headGroup.add(glassesFrame);
  
  const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.012), 
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.08, metalness: 0.6 }));
  lensL.position.set(-0.07, 0.14, 0.125);
  headGroup.add(lensL);
  
  const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.012), 
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.08, metalness: 0.6 }));
  lensR.position.set(0.07, 0.14, 0.125);
  headGroup.add(lensR);

  // Glasses arms (temples)
  const templeL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.12), glassesMat);
  templeL.position.set(-0.13, 0.14, 0.06);
  headGroup.add(templeL);

  const templeR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.12), glassesMat);
  templeR.position.set(0.13, 0.14, 0.06);
  headGroup.add(templeR);

  // ── ARMS (with hands) ──
  const createArm = (x: number) => {
    const arm = new THREE.Group();
    arm.position.set(x, 1.0, 0);
    
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.32, 0.11), sweaterMat);
    upper.position.y = -0.16;
    upper.castShadow = true;
    arm.add(upper);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), skinMat);
    lower.position.y = -0.42;
    lower.castShadow = true;
    arm.add(lower);

    // Hand
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.12), handMat);
    hand.position.set(0, -0.58, 0.02);
    hand.castShadow = true;
    arm.add(hand);

    return arm;
  };

  const leftArm = createArm(-0.3);
  const rightArm = createArm(0.3);
  g.add(leftArm);
  g.add(rightArm);

  // Initial arm pose: resting on desk (keyboard position)
  leftArm.rotation.x = -1.25;
  rightArm.rotation.x = -1.25;

  // ── LEGS (Seated at 90° bend) ──
  const createLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.38, 0);
    
    // Upper leg (thigh)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), pantsMat);
    upper.position.y = -0.21;
    upper.castShadow = true;
    leg.add(upper);

    // Knee joint
    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    knee.rotation.x = -Math.PI / 2;
    leg.add(knee);

    // Lower leg (shin)
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.15), pantsMat);
    lower.position.set(0, -0.21, 0.21);
    lower.castShadow = true;
    knee.add(lower);

    // Shoe
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), shoeMat);
    shoe.position.set(0, -0.36, 0.08);
    shoe.castShadow = true;
    knee.add(shoe);

    return leg;
  };

  g.add(createLeg(-0.11));
  g.add(createLeg(0.11));

  // ── SUBTLE IDLE ANIMATION (breathing) ──
  // Add a slight sway to the torso for lifelike presence
  g.userData.idleBreath = torso;

  // ── TAGS FOR ANIMATION ──
  g.userData.isAvatar = true;
  g.userData.head = headGroup;
  g.userData.leftArm = leftArm;
  g.userData.rightArm = rightArm;

  return g;
}