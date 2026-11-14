import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const viewer = document.querySelector("#sword-viewer");
const canvas = viewer?.querySelector("canvas");
const status = document.querySelector("#sword-viewer-status");

if (!viewer || !canvas || !status) {
  throw new Error("The sword viewer requires its canvas and status elements.");
}

const setViewerState = (state, message) => {
  viewer.dataset.state = state;
  status.dataset.state = state;
  status.textContent = message;
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(3.2, 1.7, 5.4);

scene.add(new THREE.HemisphereLight(0xc9ddff, 0x081326, 2.1));

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);

const blueFill = new THREE.DirectionalLight(0x60a5fa, 2.1);
blueFill.position.set(-5, 1, -3);
scene.add(blueFill);

const rimLight = new THREE.DirectionalLight(0x2563eb, 1.4);
rimLight.position.set(1, -3, 4);
scene.add(rimLight);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
} catch (error) {
  setViewerState("error", "3D preview unavailable because WebGL could not be initialized.");
  console.error("Could not initialize the sword model viewer.", error);
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 3.1;
controls.maxDistance = 9;
controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
controls.autoRotateSpeed = 1.1;

const resizeViewer = () => {
  const { width, height } = viewer.getBoundingClientRect();
  if (width <= 0 || height <= 0) return;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const resizeObserver = new ResizeObserver(resizeViewer);
resizeObserver.observe(viewer);
window.addEventListener("resize", resizeViewer);
resizeViewer();

const getSurfaceCenter = (object) => {
  const weightedCenter = new THREE.Vector3();
  let totalArea = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const triangleCenter = new THREE.Vector3();

  object.updateMatrixWorld(true);
  object.traverse((child) => {
    if (!child.isMesh) return;

    const positions = child.geometry.attributes.position;
    const indices = child.geometry.index;
    const triangleCount = indices ? indices.count / 3 : positions.count / 3;

    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      const offset = triangle * 3;
      const indexA = indices ? indices.getX(offset) : offset;
      const indexB = indices ? indices.getX(offset + 1) : offset + 1;
      const indexC = indices ? indices.getX(offset + 2) : offset + 2;
      a.fromBufferAttribute(positions, indexA).applyMatrix4(child.matrixWorld);
      b.fromBufferAttribute(positions, indexB).applyMatrix4(child.matrixWorld);
      c.fromBufferAttribute(positions, indexC).applyMatrix4(child.matrixWorld);
      const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;

      if (area === 0) continue;

      triangleCenter.copy(a).add(b).add(c).multiplyScalar(area / 3);
      weightedCenter.add(triangleCenter);
      totalArea += area;
    }
  });

  if (totalArea === 0) return null;
  return weightedCenter.divideScalar(totalArea);
};

const loader = new GLTFLoader();
loader.load(
  "assets/models/SWORD.glb",
  ({ scene: sword }) => {
    const bounds = new THREE.Box3().setFromObject(sword);
    const size = bounds.getSize(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(longestSide) || longestSide <= 0) {
      setViewerState("error", "The sword model contains no visible geometry.");
      console.error("SWORD.glb loaded without valid model dimensions.", { size });
      return;
    }

    const center = getSurfaceCenter(sword);
    if (!center) {
      setViewerState("error", "The sword model contains no usable surface geometry.");
      console.error("SWORD.glb has no triangles with measurable surface area.");
      return;
    }

    const modelScale = 2.35 / longestSide;
    const verticalOffset = modelScale * longestSide * 0.2;
    sword.position.sub(center);
    sword.position.y += verticalOffset;
    sword.scale.setScalar(modelScale);
    scene.add(sword);
    controls.target.set(0, 0, 0);
    controls.update();
    setViewerState("ready", "Drag to rotate · Scroll or pinch to zoom");
  },
  undefined,
  (error) => {
    setViewerState("error", "Could not load SWORD.glb. Check that the site is served from its project folder.");
    console.error("Could not load assets/models/SWORD.glb.", error);
  }
);

const render = () => {
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(render);
};

render();
