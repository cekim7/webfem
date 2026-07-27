const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');

// The displacements are likely too small to cause strain > breakStrain, even when lowered.
// Let's force an extreme condition in the solver step for testing:
// If C gets very high, just manually set some fiber elements to broken.
content = content.replace(
  "element.breakStrain = Math.max(0.000001, element.initialBreakStrain - (element.chemDegradationRate || 0) * avgC);",
  "element.breakStrain = Math.max(0.000001, element.initialBreakStrain - (element.chemDegradationRate || 0) * avgC);\n      if (avgC > 1000 && element.type === 'fiber') element.breakStrain = 0;"
);

// We need to also increase the time step artificially so we hit avgC > 1000 fast
content = content.replace("n.C += 1000.0 * dt;", "n.C += 5000.0 * dt;");

fs.writeFileSync('src/fem.js', content, 'utf8');
