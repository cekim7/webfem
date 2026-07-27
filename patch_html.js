const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const legendHtml = `
    <div id="legend" style="position: absolute; top: 10px; left: 10px; color: white; background: rgba(0,0,0,0.5); padding: 10px; font-family: sans-serif; border-radius: 5px;">
      <h3 style="margin: 0 0 10px 0; font-size: 14px;">MultiPhysics Structure</h3>
      <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <div style="width: 15px; height: 15px; background: grey; margin-right: 10px;"></div>
        <span>Matrix (Elastic)</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <div style="width: 15px; height: 15px; background: #0088ff; margin-right: 10px;"></div>
        <span>Fiber (Elastic)</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <div style="width: 15px; height: 15px; background: yellow; margin-right: 10px;"></div>
        <span>Plastic Deformation</span>
      </div>
      <div style="display: flex; align-items: center;">
        <div style="width: 15px; height: 15px; background: red; margin-right: 10px;"></div>
        <span>Broken</span>
      </div>
    </div>
    <div id="app"></div>`;

content = content.replace('<div id="app"></div>', legendHtml);
fs.writeFileSync('index.html', content, 'utf8');
