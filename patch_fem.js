const fs = require('fs');

let content = fs.readFileSync('src/fem.js', 'utf8');

const newClasses = `

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
`;

content += newClasses;

fs.writeFileSync('src/fem.js', content, 'utf8');
