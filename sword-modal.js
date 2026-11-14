import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const dialog = document.querySelector("#sword-modal");
const viewport = document.querySelector("#sword-modal-viewport");
const loading = document.querySelector("#sword-modal-loading");
const closeButton = dialog?.querySelector(".sword-modal__close");
const triggers = document.querySelectorAll("[data-sword-modal]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let activeViewer = null;
let loadingTimer = 0;

const openViewer = () => {
  if (!dialog || !viewport || !loading) return;

  if (typeof dialog.showModal !== "function") {
    window.location.href = "assets/models/SWORD.glb";
    return;
  }

  loading.classList.remove("is-hidden");
  loading.dataset.state = "loading";
  loading.textContent = "";
  const spinner = document.createElement("span");
  spinner.className = "sword-modal__spinner";
  spinner.setAttribute("aria-hidden", "true");
  const message = document.createElement("span");
  message.textContent = "Loading sword model…";
  loading.append(spinner, message);

  dialog.showModal();
  activeViewer = createViewer();
};

triggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openViewer();
  });
});

document.querySelectorAll("[data-sword-modal-card]").forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) return;
    openViewer();
  });
});

const disposeActiveViewer = () => {
  const viewer = activeViewer;
  activeViewer = null;
  window.clearTimeout(loadingTimer);

  try {
    viewer?.dispose();
  } catch (error) {
    console.error("Could not fully dispose the sword model viewer.", error);
  } finally {
    viewport?.querySelectorAll(".sword-modal__canvas").forEach((canvas) => canvas.remove());
  }
};

const closeViewer = () => {
  if (!dialog) return;
  if (dialog.open) dialog.close();
  disposeActiveViewer();
};

closeButton?.addEventListener("click", closeViewer);
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) closeViewer();
});
dialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeViewer();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog?.open) {
    event.preventDefault();
    closeViewer();
  }
});
dialog?.addEventListener("close", disposeActiveViewer);

function createViewer() {
  if (!dialog || !viewport || !loading) return null;

  const canvas = document.createElement("canvas");
  canvas.className = "sword-modal__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Interactive 3D sword model. Drag to rotate and scroll or pinch to zoom.");
  viewport.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (error) {
    loading.dataset.state = "error";
    loading.replaceChildren(document.createTextNode("3D preview is unavailable because WebGL could not be initialized."));
    console.error("Could not initialize the sword model viewer.", error);
    canvas.remove();
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

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

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.minDistance = 2.8;
  controls.maxDistance = 12;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.7;
  controls.target.set(0, 0, 0);

  let disposed = false;
  let animationFrame = 0;
  let resizeObserver = null;
  let model = null;
  let idleTimer = 0;

  const resize = () => {
    const { width, height } = viewport.getBoundingClientRect();
    if (disposed || width <= 0 || height <= 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const resetIdleTimer = () => {
    controls.autoRotate = false;
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!disposed && !reduceMotion) controls.autoRotate = true;
    }, 1800);
  };

  controls.addEventListener("start", resetIdleTimer);
  controls.addEventListener("end", resetIdleTimer);
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewport);
  resize();

  const showError = (message, error) => {
    if (disposed) return;
    loading.dataset.state = "error";
    loading.replaceChildren(document.createTextNode(message));
    console.error("Could not display the sword model in the modal.", error);
  };

  const disposeObject = (object) => {
    object.traverse((child) => {
      if (!child.isMesh) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value && value.isTexture) value.dispose();
        });
        material.dispose();
      });
    });
  };

  const loader = new GLTFLoader();
  loader.load(
    "assets/models/SWORD.glb",
    ({ scene: sword }) => {
      if (disposed) {
        disposeObject(sword);
        return;
      }

      const bounds = new THREE.Box3().setFromObject(sword);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const longestSide = Math.max(size.x, size.y, size.z);

      if (!Number.isFinite(longestSide) || longestSide <= 0) {
        showError("The sword model contains no visible geometry.");
        disposeObject(sword);
        return;
      }

      sword.position.sub(center);
      sword.scale.setScalar(2.5 / longestSide);
      scene.add(sword);
      model = sword;

      const distance = Math.max(4.5, longestSide * 1.45);
      camera.position.set(distance * 0.55, distance * 0.3, distance);
      camera.lookAt(controls.target);
      controls.update();

      loading.classList.add("is-hidden");
      loading.dataset.state = "ready";
      resetIdleTimer();
      window.clearTimeout(loadingTimer);
    },
    undefined,
    (error) => showError("Could not load SWORD.glb. Check your connection and try again.", error)
  );

  loadingTimer = window.setTimeout(() => {
    if (disposed || loading.classList.contains("is-hidden") || loading.dataset.state === "error") return;
    loading.dataset.state = "error";
    loading.replaceChildren(document.createTextNode("The model is taking longer than expected to load."));
  }, 20000);

  const render = () => {
    if (disposed) return;
    controls.update();
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(render);
  };
  render();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(idleTimer);
      window.clearTimeout(loadingTimer);
      resizeObserver?.disconnect();
      controls.removeEventListener("start", resetIdleTimer);
      controls.removeEventListener("end", resetIdleTimer);
      controls.dispose();
      if (model) disposeObject(model);
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
    }
  };
}
