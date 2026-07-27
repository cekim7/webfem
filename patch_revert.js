const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');

// I will just carefully undo the manual test patches
// Revert step
content = content.replace("n.C += 5000.0 * dt;", "n.C += 0.01 * dt;");
content = content.replace("if (element.type === 'fiber' && this.time > 1.0) element.state = 'broken';", "");
content = content.replace("const mechStrain = Math.abs(du / L);", "const mechStrain = Math.abs(du / L);");
content = content.replace("element.state = 'broken'; console.log('BROKEN', element);", "element.state = 'broken';");
content = content.replace("element.breakStrain = Math.max(0.000001", "element.breakStrain = Math.max(0.001");
content = content.replace("chemDegradationRate = 1000.0;", "chemDegradationRate = 10.0;");
content = content.replace("fx: (ix === segmentsX) ? 1e11 : 0", "fx: (ix === segmentsX) ? 1000 : 0");

fs.writeFileSync('src/fem.js', content, 'utf8');

let main = fs.readFileSync('src/main.js', 'utf8');
main = main.replace("if (element.type === 'fiber') element.state = 'broken';\nif (element.state === 'broken') {", "if (element.state === 'broken') {");
main = main.replace("if (element.state === 'broken') {\n          if (Math.random() < 0.001) console.log('rendering broken');", "if (element.state === 'broken') {");
main = main.replace("window.scaleFactor = 1;", "window.scaleFactor = 100;");

fs.writeFileSync('src/main.js', main, 'utf8');
