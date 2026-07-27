const fs = require('fs');
let content = fs.readFileSync('src/fem.js', 'utf8');

// I will force the mechanism for testing
content = content.replace(
  "const mechStrain = Math.abs(du / L) * 100000.0;",
  "const mechStrain = Math.abs(du / L);"
);

content = content.replace(
  "element.state = 'broken';",
  "element.state = 'broken'; console.log('BROKEN', element);"
);

content = content.replace(
  "if (avgC > 1000 && element.type === 'fiber') element.breakStrain = 0;",
  "if (element.type === 'fiber' && this.time > 1.0) element.state = 'broken';"
);


fs.writeFileSync('src/fem.js', content, 'utf8');
