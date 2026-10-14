const fs = require('fs');
const content = fs.readFileSync('node_modules/three-globe/dist/three-globe.mjs', 'utf8');
const matches = content.match(/from ['"]three[^'"]*['"]/g);
[...new Set(matches || [])].forEach(m => console.log(m));
