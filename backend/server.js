/*
  Minimal Node.js static server for CRA build, suitable for cPanel.
  - Serves files from ./build
  - SPA fallback to index.html for client-side routes
  - Basic gzip/brotli compression for text assets
  - Sensible cache headers for hashed assets under /static
*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUILD_DIR = path.resolve(__dirname, 'build');
const INDEX_FILE = path.join(BUILD_DIR, 'index.html');

const PORT = process.env.PORT || 5000; 
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function isTextLike(contentType) {
  return /^(text\/|application\/javascript|application\/json)/.test(contentType);
}

function shouldCacheForever(requestPath) {
  // Cache hashed assets under /static for a long time
  return requestPath.startsWith('/static/');
}

function safeJoin(base, target) {
  const targetPath = path.posix.normalize(target.replace(/\\/g, '/'));
  const resolved = path.resolve(base, '.' + targetPath);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function sendResponse(req, res, filePath, statusCode = 200) {
  const contentType = getContentType(filePath);
  const rawStream = fs.createReadStream(filePath);

  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (shouldCacheForever(req.url)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (contentType.startsWith('image/') || contentType.startsWith('font/')) {
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }

  const acceptEncoding = (req.headers['accept-encoding'] || '').toLowerCase();
  if (isTextLike(contentType)) {
    if (acceptEncoding.includes('br')) {
      res.setHeader('Content-Encoding', 'br');
      const brotli = zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
      return rawStream.pipe(brotli).pipe(res);
    }
    if (acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      const gzip = zlib.createGzip({ level: 6 });
      return rawStream.pipe(gzip).pipe(res);
    }
  }

  return rawStream.pipe(res);
}

function fileExists(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}

function handleRequest(req, res) {
  // Only support GET/HEAD for static serving
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end('Method Not Allowed');
    return;
  }

  // Normalize URL and strip query/hash
  const url = new URL(req.url, `http://${req.headers.host}`);
  let requestPath = url.pathname;

  // Default to index.html for root
  if (requestPath === '/') requestPath = '/index.html';

  const resolved = safeJoin(BUILD_DIR, requestPath);
  if (resolved && fileExists(resolved)) {
    return sendResponse(req, res, resolved, 200);
  }

  // If requesting a directory, try index.html within it
  if (resolved && fileExists(path.join(resolved, 'index.html'))) {
    return sendResponse(req, res, path.join(resolved, 'index.html'), 200);
  }

  // SPA fallback: serve index.html for client-routed paths
  // Only if the client accepts HTML
  const accept = (req.headers['accept'] || '').toLowerCase();
  if (accept.includes('text/html')) {
    if (fileExists(INDEX_FILE)) {
      return sendResponse(req, res, INDEX_FILE, 200);
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not Found');
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error(`Build directory not found: ${BUILD_DIR}`);
  console.error('Run "npm run build" locally and deploy the contents of the build folder.');
}

const server = http.createServer(handleRequest);
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});


