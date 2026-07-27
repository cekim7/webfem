const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');

// I will just force it to break visually for a sec to confirm the pipeline works
content = content.replace(
  "if (element.state === 'broken') {",
  "if (element.type === 'fiber') element.state = 'broken';\nif (element.state === 'broken') {"
);
fs.writeFileSync('src/main.js', content, 'utf8');
