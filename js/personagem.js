export let scene, camera, renderer, controls;
export let monkeyRoot, glassesGroup, muzzleMesh;
export let isTracking = true;
export let glassesOn = true;
export let mouseTarget = { x: 0, y: 0 };
export let monkeyBasePos = { x: 0, y: 0.15, z: 0 };

let muzzleCanvas, mCtx, muzzleTexture;
const imagensBoca = {};
let frameBocaAtual = '';

let matFur, matSkin, matInnerEar, matEyeWhite, matPupil;
let matGlassesFrame, matLensLeft, matLensRight;

export function setTracking(val) { isTracking = val; }
export function setGlassesOn(val) { 
  glassesOn = val; 
  if (glassesGroup) glassesGroup.visible = glassesOn;
}

export function getCSSColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

export function atualizarCoresDoCSS() {
  if (matFur) matFur.color.set(getCSSColor('--cor-pelagem'));
  if (matSkin) matSkin.color.set(getCSSColor('--cor-pele'));
  if (matInnerEar) matInnerEar.color.set(getCSSColor('--cor-orelha-interna'));
  if (matEyeWhite) matEyeWhite.color.set(getCSSColor('--cor-olhos'));
  if (matPupil) matPupil.color.set(getCSSColor('--cor-pupila'));
  if (matGlassesFrame) matGlassesFrame.color.set(getCSSColor('--cor-oculos-armacao'));
  if (matLensLeft) matLensLeft.color.set(getCSSColor('--cor-lente-esquerda'));
  if (matLensRight) matLensRight.color.set(getCSSColor('--cor-lente-direita'));

  const corFundo = getCSSColor('--cor-fundo-tela');
  if (scene && renderer) {
    scene.background.set(corFundo);
    renderer.setClearColor(new THREE.Color(corFundo), 1.0);
  }
}

export function desenharBoca(nomeFrame) {
  if (nomeFrame === frameBocaAtual) return;
  if (!mCtx || !imagensBoca[nomeFrame] || !imagensBoca[nomeFrame].complete) return;

  frameBocaAtual = nomeFrame;
  const imgAtiva = imagensBoca[nomeFrame];
  const larguraBoca = 410;
  const alturaBoca = 350;
  const posX = (1024 - larguraBoca) / 2;
  const posY = 115;

  mCtx.fillStyle = getCSSColor('--cor-pele');
  mCtx.fillRect(0, 0, 1024, 512);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = larguraBoca;
  tempCanvas.height = alturaBoca;
  const tCtx = tempCanvas.getContext('2d');

  tCtx.drawImage(imgAtiva, 0, 0, larguraBoca, alturaBoca);

  tCtx.save();
  tCtx.globalCompositeOperation = 'destination-in';

  const gradiente = tCtx.createRadialGradient(
    larguraBoca / 2, alturaBoca / 2 + 5, 45,
    larguraBoca / 2, alturaBoca / 2 + 5, larguraBoca / 2
  );
  gradiente.addColorStop(0, 'rgba(0, 0, 1)');
  gradiente.addColorStop(0.78, 'rgba(0, 0, 0, 1)');
  gradiente.addColorStop(0.98, 'rgba(0, 0, 0, 0)');

  tCtx.fillStyle = gradiente;
  tCtx.fillRect(0, 0, larguraBoca, alturaBoca);
  tCtx.restore();

  mCtx.drawImage(tempCanvas, posX, posY);

  if (muzzleTexture) {
    muzzleTexture.needsUpdate = true;
  }
}

function build3DGGlasses() {
  glassesGroup = new THREE.Group();

  matGlassesFrame = new THREE.MeshStandardMaterial({
    color: new THREE.Color(getCSSColor('--cor-oculos-armacao')),
    roughness: 0.25,
    metalness: 0.02
  });

  matLensLeft = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(getCSSColor('--cor-lente-esquerda')),
    transparent: false,
    roughness: 0.1,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    reflectivity: 0.5,
    side: THREE.DoubleSide
  });

  matLensRight = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(getCSSColor('--cor-lente-direita')),
    transparent: false,
    roughness: 0.1,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    reflectivity: 0.5,
    side: THREE.DoubleSide
  });

  const lensW = 0.52;
  const lensH = 0.36;
  const borderThickness = 0.08;
  const depth = 0.07;
  const frameOuterW = lensW + borderThickness * 2;
  const frameOuterH = lensH + borderThickness * 2;

  function createEyeBox(lensMaterial, posX) {
    const eyeBox = new THREE.Group();
    eyeBox.position.set(posX, 0.22, 1.14);

    const lensGeom = new THREE.PlaneGeometry(lensW, lensH);
    const lensMesh = new THREE.Mesh(lensGeom, lensMaterial);
    lensMesh.position.z = depth * 0.15;
    eyeBox.add(lensMesh);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(frameOuterW, borderThickness, depth), matGlassesFrame);
    topBar.position.set(0, (lensH / 2) + (borderThickness / 2), 0);
    eyeBox.add(topBar);

    const btmBar = new THREE.Mesh(new THREE.BoxGeometry(frameOuterW, borderThickness, depth), matGlassesFrame);
    btmBar.position.set(0, -((lensH / 2) + (borderThickness / 2)), 0);
    eyeBox.add(btmBar);

    const leftSide = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, lensH, depth), matGlassesFrame);
    leftSide.position.set(-((lensW / 2) + (borderThickness / 2)), 0, 0);
    eyeBox.add(leftSide);

    const rightSide = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, lensH, depth), matGlassesFrame);
    rightSide.position.set(((lensW / 2) + (borderThickness / 2)), 0, 0);
    eyeBox.add(rightSide);

    return eyeBox;
  }

  const leftEyeBox = createEyeBox(matLensLeft, -0.55);
  const rightEyeBox = createEyeBox(matLensRight, 0.55);
  glassesGroup.add(leftEyeBox, rightEyeBox);

  const centerBridge = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, depth), matGlassesFrame);
  centerBridge.position.set(0, 0.22, 1.14);
  glassesGroup.add(centerBridge);

  const hingeGeom = new THREE.BoxGeometry(0.08, 0.10, 0.10);
  const sideHingeL = new THREE.Mesh(hingeGeom, matGlassesFrame);
  sideHingeL.position.set(-0.85, 0.39, 1.12);
  const sideHingeR = new THREE.Mesh(hingeGeom, matGlassesFrame);
  sideHingeR.position.set(0.85, 0.39, 1.12);
  glassesGroup.add(sideHingeL, sideHingeR);

  const armGeomSettings = { steps: 48, tubeRadius: 0.034, radialSegments: 12, closed: false };

  const leftArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.79, 0.39, 1.10),
    new THREE.Vector3(-0.84, 0.48, 0.65),
    new THREE.Vector3(-0.91, 0.58, 0.22),
    new THREE.Vector3(-0.93, 0.62, -0.05),
    new THREE.Vector3(-0.91, 0.52, -0.16),
    new THREE.Vector3(-0.87, 0.36, -0.18),
    new THREE.Vector3(-0.84, 0.18, -0.18)
  ]);
  const leftArmMesh = new THREE.Mesh(
    new THREE.TubeGeometry(leftArmCurve, armGeomSettings.steps, armGeomSettings.tubeRadius, armGeomSettings.radialSegments, false),
    matGlassesFrame
  );
  leftArmMesh.castShadow = true;

  const rightArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.79, 0.39, 1.10),
    new THREE.Vector3(0.84, 0.48, 0.65),
    new THREE.Vector3(0.91, 0.58, 0.22),
    new THREE.Vector3(0.93, 0.62, -0.05),
    new THREE.Vector3(0.91, 0.52, -0.16),
    new THREE.Vector3(0.87, 0.36, -0.18),
    new THREE.Vector3(0.84, 0.18, -0.18)
  ]);
  const rightArmMesh = new THREE.Mesh(
    new THREE.TubeGeometry(rightArmCurve, armGeomSettings.steps, armGeomSettings.tubeRadius, armGeomSettings.radialSegments, false),
    matGlassesFrame
  );
  rightArmMesh.castShadow = true;

  glassesGroup.add(leftArmMesh, rightArmMesh);
  glassesGroup.rotation.x = -0.05;
  glassesGroup.position.set(0, -0.03, 0.04);

  monkeyRoot.add(glassesGroup);
}

function createMonkeyCharacter() {
  monkeyRoot = new THREE.Group();

  matFur = new THREE.MeshStandardMaterial({
    color: new THREE.Color(getCSSColor('--cor-pelagem')),
    roughness: 0.88,
    metalness: 0.02
  });

  matSkin = new THREE.MeshStandardMaterial({
    color: new THREE.Color(getCSSColor('--cor-pele')),
    roughness: 0.7,
    metalness: 0.02
  });

  matInnerEar = new THREE.MeshStandardMaterial({
    color: new THREE.Color(getCSSColor('--cor-orelha-interna')),
    roughness: 0.82
  });

  const headGeom = new THREE.SphereGeometry(1.05, 36, 36);
  headGeom.scale(1.0, 1.05, 0.95);
  const headMesh = new THREE.Mesh(headGeom, matFur);
  headMesh.position.set(0, 0, 0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  monkeyRoot.add(headMesh);

  const faceGeom = new THREE.SphereGeometry(0.88, 32, 28);
  faceGeom.scale(0.96, 0.9, 0.55);
  const faceMesh = new THREE.Mesh(faceGeom, matSkin);
  faceMesh.position.set(0, 0.06, 0.52);
  monkeyRoot.add(faceMesh);

  const browGeom = new THREE.CylinderGeometry(0.13, 0.16, 1.25, 20);
  browGeom.rotateZ(Math.PI / 2);
  const browMesh = new THREE.Mesh(browGeom, matFur);
  browMesh.position.set(0, 0.42, 0.8);
  browMesh.scale.set(1, 0.7, 0.8);
  monkeyRoot.add(browMesh);

  const earOuterGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.14, 32);
  earOuterGeom.rotateX(Math.PI / 2);

  const earInnerGeom = new THREE.CylinderGeometry(0.33, 0.33, 0.16, 28);
  earInnerGeom.rotateX(Math.PI / 2);

  const leftEar = new THREE.Group();
  leftEar.position.set(-1.12, 0.16, -0.05);
  leftEar.rotation.set(0.08, -0.32, -0.15);
  const leftEarOuter = new THREE.Mesh(earOuterGeom, matFur);
  const leftEarInner = new THREE.Mesh(earInnerGeom, matInnerEar);
  leftEarInner.position.z = 0.03;
  leftEar.add(leftEarOuter, leftEarInner);
  leftEar.castShadow = true;
  monkeyRoot.add(leftEar);

  const rightEar = new THREE.Group();
  rightEar.position.set(1.12, 0.16, -0.05);
  rightEar.rotation.set(0.08, 0.32, 0.15);
  const rightEarOuter = new THREE.Mesh(earOuterGeom, matFur);
  const rightEarInner = new THREE.Mesh(earInnerGeom, matInnerEar);
  rightEarInner.position.z = 0.03;
  rightEar.add(rightEarOuter, rightEarInner);
  rightEar.castShadow = true;
  monkeyRoot.add(rightEar);

  muzzleCanvas = document.createElement('canvas');
  muzzleCanvas.width = 1024;
  muzzleCanvas.height = 512;
  mCtx = muzzleCanvas.getContext('2d');

  const corPeleCSS = getCSSColor('--cor-pele');
  mCtx.fillStyle = corPeleCSS;
  mCtx.fillRect(0, 0, 1024, 512);

  muzzleTexture = new THREE.CanvasTexture(muzzleCanvas);

  const listaArquivos = {
    repouso: 'img/boca6.png',
    consoante: 'img/boca9.png',
    dentesLeve: 'img/boca10.png',
    dentes: 'img/boca5.png',
    bicoOU: 'img/boca11.png',
    abertaMedia: 'img/boca7.png',
    abertaGrande: 'img/boca8.png'
  };

  for (const [chave, path] of Object.entries(listaArquivos)) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = path;
    img.onload = () => {
      if (chave === 'repouso') desenharBoca('repouso');
    };
    imagensBoca[chave] = img;
  }

  const muzzleCustomMat = new THREE.MeshStandardMaterial({
    map: muzzleTexture,
    roughness: 0.7,
    metalness: 0.02
  });

  const muzzleGeom = new THREE.SphereGeometry(0.68, 32, 28);
  muzzleGeom.rotateY(-Math.PI / 2);

  muzzleMesh = new THREE.Mesh(muzzleGeom, muzzleCustomMat);
  muzzleMesh.scale.set(1.16, 0.88, 0.98);
  muzzleMesh.position.set(0, -0.30, 0.76);
  muzzleMesh.castShadow = true;
  monkeyRoot.add(muzzleMesh);

  matEyeWhite = new THREE.MeshStandardMaterial({
    color: new THREE.Color(getCSSColor('--cor-olhos')),
    roughness: 0.15
  });
  matPupil = new THREE.MeshBasicMaterial({
    color: new THREE.Color(getCSSColor('--cor-pupila'))
  });
  const eyeGeom = new THREE.SphereGeometry(0.17, 24, 24);
  const pupilGeom = new THREE.SphereGeometry(0.09, 16, 16);

  const eyeL = new THREE.Group();
  eyeL.position.set(-0.35, 0.22, 0.88);
  eyeL.add(new THREE.Mesh(eyeGeom, matEyeWhite));
  const eyeLPupil = new THREE.Mesh(pupilGeom, matPupil);
  eyeLPupil.position.set(0.03, 0.01, 0.12);
  eyeL.add(eyeLPupil);
  monkeyRoot.add(eyeL);

  const eyeR = new THREE.Group();
  eyeR.position.set(0.35, 0.22, 0.88);
  eyeR.add(new THREE.Mesh(eyeGeom, matEyeWhite));
  const eyeRPupil = new THREE.Mesh(pupilGeom, matPupil);
  eyeRPupil.position.set(-0.03, 0.01, 0.12);
  eyeR.add(eyeRPupil);
  monkeyRoot.add(eyeR);

  const hairGeom = new THREE.ConeGeometry(0.2, 0.45, 12);
  hairGeom.rotateZ(-0.25);
  hairGeom.rotateX(-0.1);
  const hairMesh = new THREE.Mesh(hairGeom, matFur);
  hairMesh.position.set(0.05, 1.18, 0.1);
  monkeyRoot.add(hairMesh);

  build3DGGlasses();

  monkeyRoot.position.set(0, 0.15, 0);
  scene.add(monkeyRoot);
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xfff6ed, 0.85);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfffaed, 1.6);
  keyLight.position.set(4.5, 6, 4.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x8bc34a, 0.5, 15);
  fillLight.position.set(-4.5, 2.5, 2.5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
  rimLight.position.set(0, 3, -4.5);
  scene.add(rimLight);
}

export function initScene() {
  const container = document.getElementById('canvas-container');
  scene = new THREE.Scene();
  const corFundoInicial = getCSSColor('--cor-fundo-tela') || '#19f105';
  scene.background = new THREE.Color(corFundoInicial);

  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 100);
  camera.position.set(0, 0.15, 3.8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(new THREE.Color(corFundoInicial), 1.0);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2.0;
  controls.maxDistance = 20.0;
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.target.set(0, 0.15, 0);

  setupLighting();
  createMonkeyCharacter();
}

export function onWindowResize() {
  const container = document.getElementById('canvas-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}