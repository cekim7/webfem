const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');

// crank up the degradation and pull force
content = content.replace('n.C += 0.01 * dt;', 'n.C += 1000.0 * dt;');
content = content.replace('n.C += 50.0 * dt;', 'n.C += 1000.0 * dt;');
content = content.replace('n.C += 500.0 * dt;', 'n.C += 1000.0 * dt;');
content = content.replace('fx: (ix === segmentsX) ? 1e9 : 0', 'fx: (ix === segmentsX) ? 1e11 : 0');
content = content.replace('fx: (ix === segmentsX) ? 1000 : 0', 'fx: (ix === segmentsX) ? 1e11 : 0');
content = content.replace('chemDegradationRate = 10.0;', 'chemDegradationRate = 1000.0;');
content = content.replace('element.breakStrain = Math.max(0.001', 'element.breakStrain = Math.max(0.000001');

fs.writeFileSync('src/fem.js', content, 'utf8');
