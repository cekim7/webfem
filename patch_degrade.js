const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');

// Patch 1: Update generateFiberMatrixTruss
const oldTruss = `
    let type = 'matrix';
    let E = 10e9; // 10 GPa for matrix
    let alpha = 1e-5;
    let beta = 0.01;
    let yieldStrain = 0.01;
    let breakStrain = 0.05;

    if (dist < fiberRadius) {
      type = 'fiber';
      E = 200e9; // 200 GPa for fiber
      alpha = 5e-6; // less thermal expansion
      beta = 0.001; // less chemical swelling
      yieldStrain = 0.05; // yields much later
      breakStrain = 0.1; // breaks later
    }

    elements.push({
      node1: n1.id,
      node2: n2.id,
      E,
      A: 0.001, // 10 cm^2
      type,
      alpha,
      beta,
      yieldStrain,
      breakStrain
    });
`;

const newTruss = `
    let type = 'matrix';
    let E = 10e9; // 10 GPa for matrix
    let alpha = 1e-5;
    let beta = 0.01;
    let yieldStrain = 0.01;
    let breakStrain = 0.05;
    let chemDegradationRate = 0.0; // Matrix does not chemically degrade

    if (dist < fiberRadius) {
      type = 'fiber';
      E = 200e9; // 200 GPa for fiber
      alpha = 5e-6; // less thermal expansion
      beta = 0.001; // less chemical swelling
      yieldStrain = 0.05; // yields much later
      breakStrain = 0.1; // breaks later
      chemDegradationRate = 10.0; // Fibers degrade heavily with chemical concentration
    }

    elements.push({
      node1: n1.id,
      node2: n2.id,
      E,
      A: 0.001, // 10 cm^2
      type,
      alpha,
      beta,
      yieldStrain,
      breakStrain,
      initialBreakStrain: breakStrain,
      chemDegradationRate
    });
`;

content = content.replace(oldTruss, newTruss);

// Patch 2: Update MultiPhysicsSolver.step
const oldStep = `
    // Update states
    this.elements.forEach(element => {
      if (element.state === 'broken') return;

      const n1 = this.nodes[nodeMap.get(element.node1)];
      const n2 = this.nodes[nodeMap.get(element.node2)];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dz = n2.z - n1.z;
      const L = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const cx = dx / L;
      const cy = dy / L;
      const cz = dz / L;

      // relative displacement
      const du = (n2.dx - n1.dx) * cx + (n2.dy - n1.dy) * cy + (n2.dz - n1.dz) * cz;
      const mechStrain = Math.abs(du / L);

      if (element.breakStrain && mechStrain > element.breakStrain) {
        element.state = 'broken';
      } else if (element.yieldStrain && mechStrain > element.yieldStrain && element.state === 'elastic') {
        element.state = 'plastic';
      }
    });
`;

const newStep = `
    // Update states
    this.elements.forEach(element => {
      if (element.state === 'broken') return;

      const n1 = this.nodes[nodeMap.get(element.node1)];
      const n2 = this.nodes[nodeMap.get(element.node2)];

      // Calculate chemical degradation
      const avgC = (n1.C + n2.C) / 2;
      if (element.initialBreakStrain !== undefined) {
          element.breakStrain = Math.max(0.001, element.initialBreakStrain - (element.chemDegradationRate || 0) * avgC);
      }

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dz = n2.z - n1.z;
      const L = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const cx = dx / L;
      const cy = dy / L;
      const cz = dz / L;

      // relative displacement
      const du = (n2.dx - n1.dx) * cx + (n2.dy - n1.dy) * cy + (n2.dz - n1.dz) * cz;
      const mechStrain = Math.abs(du / L);

      if (element.breakStrain && mechStrain > element.breakStrain) {
        element.state = 'broken';
      } else if (element.yieldStrain && mechStrain > element.yieldStrain && element.state === 'elastic') {
        element.state = 'plastic';
      }
    });
`;

content = content.replace(oldStep, newStep);
fs.writeFileSync('src/fem.js', content, 'utf8');
