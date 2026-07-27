/**
 * 3D Truss Finite Element Method Solver
 */

/**
 * Solves Ax = b using Gaussian elimination with partial pivoting.
 * Modifies A and b in place.
 * @param {Array<Array<number>>} A - Matrix A
 * @param {Array<number>} b - Vector b
 * @returns {Array<number>} - Solution vector x
 */
function gaussianElimination(A, b) {
  const n = A.length;

  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows in A and b
    let tempRow = A[i];
    A[i] = A[maxRow];
    A[maxRow] = tempRow;

    let tempB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tempB;

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      b[k] += c * b[i];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = b[i];
    for (let j = i + 1; j < n; j++) {
      x[i] -= A[i][j] * x[j];
    }
    x[i] = x[i] / A[i][i];
  }
  return x;
}

/**
 * Performs a 3D Truss FEM analysis.
 *
 * @param {Array} nodes - Array of nodes: { id, x, y, z, fx, fy, fz, fixedX, fixedY, fixedZ }
 * @param {Array} elements - Array of elements: { node1 (id), node2 (id), E, A }
 * @returns {Array} - Array of nodes with updated displacements: { ...node, dx, dy, dz }
 */
export function solveFEM(nodes, elements) {
  const numNodes = nodes.length;
  const numDofs = numNodes * 3;

  // Initialize global stiffness matrix K (numDofs x numDofs) and force vector F (numDofs x 1)
  const K = Array.from({ length: numDofs }, () => new Array(numDofs).fill(0));
  const F = new Array(numDofs).fill(0);

  // Map node id to index
  const nodeMap = new Map();
  nodes.forEach((node, index) => {
    nodeMap.set(node.id, index);

    // Populate force vector
    F[index * 3] = node.fx || 0;
    F[index * 3 + 1] = node.fy || 0;
    F[index * 3 + 2] = node.fz || 0;
  });

  // Assemble global stiffness matrix
  elements.forEach(element => {
    const n1 = nodes[nodeMap.get(element.node1)];
    const n2 = nodes[nodeMap.get(element.node2)];

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const dz = n2.z - n1.z;
    const L = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const cx = dx / L;
    const cy = dy / L;
    const cz = dz / L;

    const E = element.E;
    const A = element.A;
    const k = (E * A) / L;

    // Transformation matrix components
    const T = [
      [cx * cx, cx * cy, cx * cz],
      [cy * cx, cy * cy, cy * cz],
      [cz * cx, cz * cy, cz * cz]
    ];

    const idx1 = nodeMap.get(n1.id) * 3;
    const idx2 = nodeMap.get(n2.id) * 3;

    // Add to global K
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const val = k * T[i][j];

        K[idx1 + i][idx1 + j] += val;
        K[idx2 + i][idx2 + j] += val;

        K[idx1 + i][idx2 + j] -= val;
        K[idx2 + i][idx1 + j] -= val;
      }
    }
  });

  // Apply boundary conditions
  nodes.forEach((node, index) => {
    const dofs = [
      { isFixed: node.fixedX, idx: index * 3 },
      { isFixed: node.fixedY, idx: index * 3 + 1 },
      { isFixed: node.fixedZ, idx: index * 3 + 2 },
    ];

    dofs.forEach(dof => {
      if (dof.isFixed) {
        // Zero out row and column
        for (let i = 0; i < numDofs; i++) {
          K[dof.idx][i] = 0;
          K[i][dof.idx] = 0;
        }
        // Set diagonal to 1 and force to 0
        K[dof.idx][dof.idx] = 1;
        F[dof.idx] = 0;
      }
    });
  });

  // Solve Kd = F
  const displacements = gaussianElimination(K, F);

  // Attach displacements to nodes
  return nodes.map((node, index) => ({
    ...node,
    dx: displacements[index * 3],
    dy: displacements[index * 3 + 1],
    dz: displacements[index * 3 + 2]
  }));
}

/**
 * Generates a sample 3D truss structure (e.g., a cantilever truss)
 */
export function generateSampleTruss() {
  const nodes = [];
  const elements = [];
  const E = 200e9; // Young's modulus (Pa) - steel
  const A = 0.01;  // Cross-sectional area (m^2)

  // A simple 3D cantilever truss (bridge-like)
  const length = 5;
  const height = 1;
  const depth = 1;
  const segments = 5;

  let idCounter = 1;
  for (let i = 0; i <= segments; i++) {
    const x = i * (length / segments);

    // Bottom nodes (z = 0)
    nodes.push({ id: idCounter++, x, y: 0, z: 0, fixedX: i === 0, fixedY: i === 0, fixedZ: i === 0 });
    nodes.push({ id: idCounter++, x, y: 0, z: depth, fixedX: i === 0, fixedY: i === 0, fixedZ: i === 0 });

    // Top nodes (z = depth)
    nodes.push({ id: idCounter++, x, y: height, z: 0, fixedX: i === 0, fixedY: i === 0, fixedZ: i === 0 });
    nodes.push({ id: idCounter++, x, y: height, z: depth, fixedX: i === 0, fixedY: i === 0, fixedZ: i === 0 });
  }

  // Apply a downward force at the end
  const lastNodes = nodes.slice(-4);
  lastNodes.forEach(n => {
    n.fy = -100000; // 100 kN downwards
  });

  // Create elements
  for (let i = 0; i < segments; i++) {
    const baseIdx = i * 4;
    const nextIdx = (i + 1) * 4;

    const b1 = nodes[baseIdx].id;
    const b2 = nodes[baseIdx + 1].id;
    const t1 = nodes[baseIdx + 2].id;
    const t2 = nodes[baseIdx + 3].id;

    const nb1 = nodes[nextIdx].id;
    const nb2 = nodes[nextIdx + 1].id;
    const nt1 = nodes[nextIdx + 2].id;
    const nt2 = nodes[nextIdx + 3].id;

    // Longitudinal
    elements.push({ node1: b1, node2: nb1, E, A });
    elements.push({ node1: b2, node2: nb2, E, A });
    elements.push({ node1: t1, node2: nt1, E, A });
    elements.push({ node1: t2, node2: nt2, E, A });

    // Vertical
    elements.push({ node1: b1, node2: t1, E, A });
    elements.push({ node1: b2, node2: t2, E, A });
    elements.push({ node1: nb1, node2: nt1, E, A });
    elements.push({ node1: nb2, node2: nt2, E, A });

    // Horizontal cross
    elements.push({ node1: b1, node2: b2, E, A });
    elements.push({ node1: t1, node2: t2, E, A });
    elements.push({ node1: nb1, node2: nb2, E, A });
    elements.push({ node1: nt1, node2: nt2, E, A });

    // Diagonals (Faces)
    elements.push({ node1: b1, node2: nt1, E, A });
    elements.push({ node1: b2, node2: nt2, E, A });
    elements.push({ node1: b1, node2: nb2, E, A });
    elements.push({ node1: t1, node2: nt2, E, A });
  }

  return { nodes, elements };
}


export class MultiPhysicsSolver {
  constructor(nodes, elements) {
    this.nodes = nodes.map(n => ({ ...n, T: 0, C: 0, dx: 0, dy: 0, dz: 0 }));
    this.elements = elements.map(e => ({ ...e, state: 'elastic' }));
    this.time = 0;
  }

  step(dt) {
    this.time += dt;
    const numNodes = this.nodes.length;
    const numDofs = numNodes * 3;

    // We increase temperature and concentration artificially as time passes to drive deformation
    this.nodes.forEach(n => {
      // e.g. heating on one side
      if (n.x > 0) {
          n.T += 10 * dt;
          n.C += 0.01 * dt;
      }
    });

    const K = Array.from({ length: numDofs }, () => new Array(numDofs).fill(0));
    const F = new Array(numDofs).fill(0);

    const nodeMap = new Map();
    this.nodes.forEach((node, index) => {
      nodeMap.set(node.id, index);
      F[index * 3] = node.fx || 0;
      F[index * 3 + 1] = node.fy || 0;
      F[index * 3 + 2] = node.fz || 0;
    });

    this.elements.forEach(element => {
      const n1 = this.nodes[nodeMap.get(element.node1)];
      const n2 = this.nodes[nodeMap.get(element.node2)];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dz = n2.z - n1.z;
      const L = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const cx = dx / L;
      const cy = dy / L;
      const cz = dz / L;

      // Effective stiffness based on state
      let E_eff = element.E;
      if (element.state === 'plastic') E_eff = element.E * 0.1;
      if (element.state === 'broken') E_eff = element.E * 1e-9;

      const k = (E_eff * element.A) / L;

      // Thermo-chemical induced strain
      const avgT = (n1.T + n2.T) / 2;
      const avgC = (n1.C + n2.C) / 2;
      const inducedStrain = (element.alpha || 0) * avgT + (element.beta || 0) * avgC;

      // Equivalent nodal forces due to induced strain: F = E * A * inducedStrain
      const thermalForce = E_eff * element.A * inducedStrain;
      const tfx = thermalForce * cx;
      const tfy = thermalForce * cy;
      const tfz = thermalForce * cz;

      // Internal forces apply equal and opposite to nodes
      const idx1 = nodeMap.get(n1.id) * 3;
      const idx2 = nodeMap.get(n2.id) * 3;

      F[idx1] -= tfx;
      F[idx1 + 1] -= tfy;
      F[idx1 + 2] -= tfz;

      F[idx2] += tfx;
      F[idx2 + 1] += tfy;
      F[idx2 + 2] += tfz;

      const T = [
        [cx * cx, cx * cy, cx * cz],
        [cy * cx, cy * cy, cy * cz],
        [cz * cx, cz * cy, cz * cz]
      ];

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const val = k * T[i][j];
          K[idx1 + i][idx1 + j] += val;
          K[idx2 + i][idx2 + j] += val;
          K[idx1 + i][idx2 + j] -= val;
          K[idx2 + i][idx1 + j] -= val;
        }
      }
    });

    this.nodes.forEach((node, index) => {
      const dofs = [
        { isFixed: node.fixedX, idx: index * 3 },
        { isFixed: node.fixedY, idx: index * 3 + 1 },
        { isFixed: node.fixedZ, idx: index * 3 + 2 },
      ];

      dofs.forEach(dof => {
        if (dof.isFixed) {
          for (let i = 0; i < numDofs; i++) {
            K[dof.idx][i] = 0;
            K[i][dof.idx] = 0;
          }
          K[dof.idx][dof.idx] = 1;
          F[dof.idx] = 0;
        }
      });
    });

    const displacements = gaussianElimination(K, F);

    this.nodes.forEach((node, index) => {
      node.dx = displacements[index * 3];
      node.dy = displacements[index * 3 + 1];
      node.dz = displacements[index * 3 + 2];
    });

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
  }
}


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
