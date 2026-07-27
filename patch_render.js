const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');

// Is ThreeJS not updating because we are missing a flag?
// Or is it actually hiding broken elements?
// Ah! If it's a LineSegments, and we set it to red, it should be red.
// Let's check the render loop.

// Oh, I see. In fem.js, when it's broken:
// if (element.state === 'broken') return;
// This means we stop updating its displacements, BUT it should still be in the elements list and its state is 'broken'.
// Let's force a console log in main.js to see if it's hitting broken.
content = content.replace(
  "if (element.state === 'broken') {",
  "if (element.state === 'broken') {\n          if (Math.random() < 0.001) console.log('rendering broken');"
);
fs.writeFileSync('src/main.js', content, 'utf8');
