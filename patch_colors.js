const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');

// The line segment color array is structured strangely. Let's make sure broken fibers actually render as RED and not black/hidden
content = content.replace(
  "if (element.state === 'broken') {\n          // Red for broken\n          r = 1; g = 0; b = 0;\n        }",
  "if (element.state === 'broken') {\n          // Red for broken\n          r = 1; g = 0; b = 0;\n        }"
);
// It looks correct. Wait, if it's broken, does the solver set E_eff to 0 (or 1e-9) and cause it to shrink to nothing so it's not visible?
