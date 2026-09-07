const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'frontend', 'src');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('http://localhost:5000')) {
        console.log('Updating:', fullPath);
        // Replace http://localhost:5000 with relative paths
        const updated = content.replace(/http:\/\/localhost:5000/g, '');
        fs.writeFileSync(fullPath, updated, 'utf8');
      }
    }
  }
}

processDir(srcDir);
console.log('All frontend API calls updated to relative paths successfully.');
