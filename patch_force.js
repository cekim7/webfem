const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');
content = content.replace('fx: (ix === segmentsX) ? 1000 : 0', 'fx: (ix === segmentsX) ? 10e9 : 0');
fs.writeFileSync('src/fem.js', content, 'utf8');
