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
