const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Enable CORS for all local requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Proxy endpoint
  if (pathname === '/proxy') {
    const targetUrl = parsedUrl.query.url;
    if (!targetUrl) {
      res.writeHead(400);
      res.end('Missing url parameter');
      return;
    }

    console.log(`Proxying request to: ${targetUrl}`);

    const targetParsedUrl = url.parse(targetUrl);
    const options = {
      hostname: targetParsedUrl.hostname,
      port: targetParsedUrl.port || (targetParsedUrl.protocol === 'https:' ? 443 : 80),
      path: targetParsedUrl.path,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetParsedUrl.hostname,
      }
    };

    // Remove some headers that might cause issues
    delete options.headers['origin'];
    delete options.headers['referer'];

    const proxyReq = (targetParsedUrl.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
      // Copy headers from target but override CORS ones
      const headers = { ...proxyRes.headers };
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';

      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500);
      res.end('Proxy Error');
    });

    req.pipe(proxyReq, { end: true });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`CORS Proxy available at http://localhost:${PORT}/proxy?url=[TARGET_URL]`);
});
