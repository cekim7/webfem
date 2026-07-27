import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Setup basic scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Optimize for macOS retina displays
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('app').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Grid helper
const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
gridHelper.position.y = -2;
scene.add(gridHelper);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

import { generateSampleTruss, solveFEM } from './fem.js';

const trussData = generateSampleTruss();
const solvedNodes = solveFEM(trussData.nodes, trussData.elements);

// Create mesh for original structure (Grey)
const originalMaterial = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 });
const originalPoints = [];

// Create mesh for deformed structure (Red)
const deformedMaterial = new THREE.LineBasicMaterial({ color: 0xff3333 });
const deformedPoints = [];

// Scale factor for displacements to make them visible
const scaleFactor = 500;

trussData.elements.forEach(element => {
  const n1 = solvedNodes.find(n => n.id === element.node1);
  const n2 = solvedNodes.find(n => n.id === element.node2);

  if (n1 && n2) {
    // Original structure
    originalPoints.push(new THREE.Vector3(n1.x, n1.y, n1.z));
    originalPoints.push(new THREE.Vector3(n2.x, n2.y, n2.z));

    // Deformed structure
    deformedPoints.push(new THREE.Vector3(
      n1.x + (n1.dx || 0) * scaleFactor,
      n1.y + (n1.dy || 0) * scaleFactor,
      n1.z + (n1.dz || 0) * scaleFactor
    ));
    deformedPoints.push(new THREE.Vector3(
      n2.x + (n2.dx || 0) * scaleFactor,
      n2.y + (n2.dy || 0) * scaleFactor,
      n2.z + (n2.dz || 0) * scaleFactor
    ));
  }
});

const originalGeometry = new THREE.BufferGeometry().setFromPoints(originalPoints);
const originalLines = new THREE.LineSegments(originalGeometry, originalMaterial);
scene.add(originalLines);

const deformedGeometry = new THREE.BufferGeometry().setFromPoints(deformedPoints);
const deformedLines = new THREE.LineSegments(deformedGeometry, deformedMaterial);
scene.add(deformedLines);

// Center camera on the structure
camera.position.set(2.5, 2, 8);
controls.target.set(2.5, 0.5, 0.5);
controls.update();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
