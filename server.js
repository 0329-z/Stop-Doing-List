const http = require('http');
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '不做清单demo');
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(baseDir, urlPath === '/' ? 'index.html' : urlPath);
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf'
  };
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end('File not found: ' + filePath);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(8080, () => {
  console.log('Server running on http://localhost:8080');
  console.log('Serving from:', baseDir);
});