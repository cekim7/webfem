const fs = require('fs');

let content = fs.readFileSync('src/fem.js', 'utf8');

const newFunction = `

export function generateFiberMatrixTruss(length, width, height, segmentsX, segmentsY, segmentsZ, fiberRadius) {
  const nodes = [];
  const elements = [];

  let idCounter = 1;

  // Generate nodes on a grid
  for (let ix = 0; ix <= segmentsX; ix++) {
    for (let iy = 0; iy <= segmentsY; iy++) {
      for (let iz = 0; iz <= segmentsZ; iz++) {
        const x = ix * (length / segmentsX);
        const y = iy * (width / segmentsY);
        const z = iz * (height / segmentsZ);

        const fixed = (ix === 0);
        nodes.push({
          id: idCounter++,
          ix, iy, iz, // store indices to help creating elements
          x, y, z,
          fixedX: fixed, fixedY: fixed, fixedZ: fixed,
          fx: (ix === segmentsX) ? 1000 : 0 // Apply some pull force at the end
        });
      }
    }
  }

  // Helper to find node by indices
  const getNode = (ix, iy, iz) => {
    return nodes.find(n => n.ix === ix && n.iy === iy && n.iz === iz);
  };

  // Center of the cross section for fiber check
  const cy = width / 2;
  const cz = height / 2;

  const createElement = (n1, n2) => {
    if (!n1 || !n2) return;
    const midY = (n1.y + n2.y) / 2;
    const midZ = (n1.z + n2.z) / 2;
    const dist = Math.sqrt(Math.pow(midY - cy, 2) + Math.pow(midZ - cz, 2));

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
  };

  // Create elements (along X, Y, Z, and some diagonals for stability)
  for (let ix = 0; ix < segmentsX; ix++) {
    for (let iy = 0; iy < segmentsY; iy++) {
      for (let iz = 0; iz < segmentsZ; iz++) {
        const n000 = getNode(ix, iy, iz);
        const n100 = getNode(ix + 1, iy, iz);
        const n010 = getNode(ix, iy + 1, iz);
        const n001 = getNode(ix, iy, iz + 1);
        const n110 = getNode(ix + 1, iy + 1, iz);
        const n101 = getNode(ix + 1, iy, iz + 1);
        const n011 = getNode(ix, iy + 1, iz + 1);
        const n111 = getNode(ix + 1, iy + 1, iz + 1);

        // Edges
        createElement(n000, n100);
        createElement(n000, n010);
        createElement(n000, n001);

        if (ix === segmentsX - 1) {
          createElement(n100, n110);
          createElement(n100, n101);
        }
        if (iy === segmentsY - 1) {
          createElement(n010, n110);
          createElement(n010, n011);
        }
        if (iz === segmentsZ - 1) {
          createElement(n001, n101);
          createElement(n001, n011);
        }

        // Face diagonals (to make it a stable truss)
        createElement(n000, n110); // XY
        createElement(n000, n101); // XZ
        createElement(n000, n011); // YZ

        // Optional: internal body diagonal for full tetrahedra
        createElement(n000, n111);
      }
    }
  }

  // Close the final faces
  for (let iy = 0; iy < segmentsY; iy++) {
    for (let iz = 0; iz < segmentsZ; iz++) {
      const n100 = getNode(segmentsX, iy, iz);
      const n110 = getNode(segmentsX, iy + 1, iz);
      const n101 = getNode(segmentsX, iy, iz + 1);
      const n111 = getNode(segmentsX, iy + 1, iz + 1);

      createElement(n100, n111);
    }
  }

  for (let ix = 0; ix < segmentsX; ix++) {
    for (let iz = 0; iz < segmentsZ; iz++) {
      const n010 = getNode(ix, segmentsY, iz);
      const n110 = getNode(ix + 1, segmentsY, iz);
      const n011 = getNode(ix, segmentsY, iz + 1);
      const n111 = getNode(ix + 1, segmentsY, iz + 1);

      createElement(n010, n111);
    }
  }

  for (let ix = 0; ix < segmentsX; ix++) {
    for (let iy = 0; iy < segmentsY; iy++) {
      const n001 = getNode(ix, iy, segmentsZ);
      const n101 = getNode(ix + 1, iy, segmentsZ);
      const n011 = getNode(ix, iy + 1, segmentsZ);
      const n111 = getNode(ix + 1, iy + 1, segmentsZ);

      createElement(n001, n111);
    }
  }


  return { nodes, elements };
}
`;

content += newFunction;
fs.writeFileSync('src/fem.js', content, 'utf8');
