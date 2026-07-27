const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');

const oldAnimate = `// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();`;

const newAnimate = `// Animation loop
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

animate();`;

content = content.replace(oldAnimate, newAnimate);
fs.writeFileSync('src/main.js', content, 'utf8');
