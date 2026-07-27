const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');
content = content.replace('window.scaleFactor = 100;', 'window.scaleFactor = 1;');
fs.writeFileSync('src/main.js', content, 'utf8');

let femContent = fs.readFileSync('src/fem.js', 'utf8');
femContent = femContent.replace('n.C += 500.0 * dt; n.T += 500.0 * dt;', 'n.C += 50.0 * dt;');
femContent = femContent.replace('fx: (ix === segmentsX) ? 10e9 : 0', 'fx: (ix === segmentsX) ? 1e9 : 0');
fs.writeFileSync('src/fem.js', femContent, 'utf8');
