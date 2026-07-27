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

import { generateFiberMatrixTruss, MultiPhysicsSolver } from './fem.js';


const length = 5;
const width = 1;
const height = 1;
const trussData = generateFiberMatrixTruss(length, width, height, 10, 4, 4, 0.4);

// Make solver globally accessible for the animate loop
window.solver = new MultiPhysicsSolver(trussData.nodes, trussData.elements);

const numElements = trussData.elements.length;
const positions = new Float32Array(numElements * 2 * 3);
const colors = new Float32Array(numElements * 2 * 3);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
const lines = new THREE.LineSegments(geometry, material);
scene.add(lines);

// Keep reference to geometry to update it
window.trussGeometry = geometry;
window.scaleFactor = 100; // MultiPhysics solver uses smaller displacements


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

  if (window.solver && window.trussGeometry) {
    // Advance simulation
    window.solver.step(0.01);

    const positions = window.trussGeometry.attributes.position.array;
    const colors = window.trussGeometry.attributes.color.array;
    const elements = window.solver.elements;
    const nodes = window.solver.nodes;

    // Quick node lookup
    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    let posIdx = 0;
    let colIdx = 0;

    elements.forEach(element => {
      const n1 = nodeMap.get(element.node1);
      const n2 = nodeMap.get(element.node2);

      if (n1 && n2) {
        // Position
        positions[posIdx++] = n1.x + (n1.dx || 0) * window.scaleFactor;
        positions[posIdx++] = n1.y + (n1.dy || 0) * window.scaleFactor;
        positions[posIdx++] = n1.z + (n1.dz || 0) * window.scaleFactor;

        positions[posIdx++] = n2.x + (n2.dx || 0) * window.scaleFactor;
        positions[posIdx++] = n2.y + (n2.dy || 0) * window.scaleFactor;
        positions[posIdx++] = n2.z + (n2.dz || 0) * window.scaleFactor;

        // Color based on type and state
        let r = 0, g = 0, b = 0;

        if (element.state === 'broken') {
          // Red for broken
          r = 1; g = 0; b = 0;
        } else if (element.state === 'plastic') {
          // Yellow for yielded/plastic
          r = 1; g = 1; b = 0;
        } else {
          // Elastic state
          if (element.type === 'fiber') {
            // Blue for fiber
            r = 0; g = 0.5; b = 1;
          } else {
            // Grey for matrix
            r = 0.5; g = 0.5; b = 0.5;
          }
        }

        // Apply color to both vertices of the line segment
        colors[colIdx++] = r; colors[colIdx++] = g; colors[colIdx++] = b;
        colors[colIdx++] = r; colors[colIdx++] = g; colors[colIdx++] = b;
      }
    });

    window.trussGeometry.attributes.position.needsUpdate = true;
    window.trussGeometry.attributes.color.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

animate();
