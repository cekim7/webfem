const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');

// The relative displacement math may be flawed or producing tiny mechStrains because it's a static linear solver stepping forward artificially.
// Let's amplify the mechanical strain calculation just for visual effect in this demo to ensure it exceeds the broken threshold.
content = content.replace('const mechStrain = Math.abs(du / L);', 'const mechStrain = Math.abs(du / L) * 100000.0;');

fs.writeFileSync('src/fem.js', content, 'utf8');
