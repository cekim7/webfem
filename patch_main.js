const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');

// replace imports
content = content.replace(
  "import { generateSampleTruss, solveFEM } from './fem.js';",
  "import { generateFiberMatrixTruss, MultiPhysicsSolver } from './fem.js';"
);

// replace static initialization
const oldSetup = `const trussData = generateSampleTruss();
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
scene.add(deformedLines);`;

const newSetup = `
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
`;

content = content.replace(oldSetup, newSetup);
fs.writeFileSync('src/main.js', content, 'utf8');
