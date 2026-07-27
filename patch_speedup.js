const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');
content = content.replace('n.C += 0.01 * dt;', 'n.C += 0.5 * dt;');
fs.writeFileSync('src/fem.js', content, 'utf8');
