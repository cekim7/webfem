const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');
content = content.replace('n.C += 50.0 * dt;', 'n.C += 500.0 * dt; n.T += 500.0 * dt;');
fs.writeFileSync('src/fem.js', content, 'utf8');
