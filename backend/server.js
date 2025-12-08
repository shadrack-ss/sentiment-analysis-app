/*
  Minimal Node.js static server for CRA build, suitable for cPanel.
  - Serves files from ./build
  - SPA fallback to index.html for client-side routes
  - Basic gzip/brotli compression for text assets
  - Sensible cache headers for hashed assets under /static
  - API routes for Twitter integration
*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const url = require('url');

// Load environment variables
require('dotenv').config();

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

// API Routes - Load handlers
let handlePostReply;
try {
  handlePostReply = require('./api/twitter/post-reply');
  console.log('✓ Twitter API handler loaded successfully');
} catch (error) {
  console.warn('⚠️  Warning: Twitter API handler not found. API routes will not work.');
  console.warn('   Expected file: ./api/twitter/post-reply.js');
}

async function handleApiRequest(req, res, pathname) {
  console.log('====================================');
  console.log('API Request:', req.method, pathname);
  console.log('Timestamp:', new Date().toISOString());
  console.log('====================================');
  
  // Set CORS headers for all API requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - responding with CORS headers');
    res.statusCode = 200;
    res.end();
    return true;
  }
  
  // Health check endpoint
  if (pathname === '/api/health') {
    console.log('Health check endpoint hit');
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      port: PORT,
      env: {
        hasTwitterToken: !!process.env.TWITTER_ACCESS_TOKEN,
        hasOAuth1: !!(process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET),
        testMode: process.env.TWITTER_TEST_MODE === 'true'
      }
    }));
    return true;
  }
  
  // Twitter post-reply endpoint
  if (pathname === '/api/twitter/post-reply') {
    if (req.method !== 'POST') {
      console.log('Invalid method for post-reply:', req.method);
      res.statusCode = 405;
      res.end(JSON.stringify({ 
        success: false, 
        message: 'Method not allowed. Use POST.' 
      }));
      return true;
    }
    
    if (!handlePostReply) {
      console.error('Twitter API handler not loaded');
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        success: false, 
        message: 'Twitter API handler not configured on server' 
      }));
      return true;
    }
    
    try {
      console.log('Calling Twitter API handler...');
      await handlePostReply(req, res);
      console.log('Twitter API handler completed');
      return true;
    } catch (error) {
      console.error('Error in Twitter API handler:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }));
      return true;
    }
  }
  
  // Unknown API route
  console.log('Unknown API route:', pathname);
  res.statusCode = 404;
  res.end(JSON.stringify({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'POST /api/twitter/post-reply'
    ]
  }));
  return true;
}

async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  // Handle API routes first
  if (pathname.startsWith('/api/')) {
    console.log('API route detected:', pathname);
    try {
      await handleApiRequest(req, res, pathname);
      return;
    } catch (error) {
      console.error('Unhandled error in API request:', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Internal server error' 
        }));
      }
      return;
    }
  }
  
  // Only support GET/HEAD for static serving
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end('Method Not Allowed');
    return;
  }

  // Normalize URL and strip query/hash
  let requestPath = pathname;

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

// Startup checks
if (!fs.existsSync(BUILD_DIR)) {
  console.warn(`⚠️  Build directory not found: ${BUILD_DIR}`);
  console.warn('   The static file serving will not work until you build the frontend.');
  console.warn('   Run "npm run build" in the frontend directory.');
}

const server = http.createServer(handleRequest);

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`   Run: lsof -i :${PORT} to see what's using it`);
    console.error(`   Or kill it: kill -9 $(lsof -t -i:${PORT})`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nSIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

server.listen(PORT, HOST, () => {
  console.log('====================================');
  console.log(`🚀 Server running at http://${HOST}:${PORT}/`);
  console.log('====================================');
  console.log('📍 Available Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/twitter/post-reply`);
  console.log('====================================');
  console.log('🔧 Environment:');
  console.log(`   Twitter Token: ${process.env.TWITTER_ACCESS_TOKEN ? '✓ Configured' : '✗ Missing'}`);
  console.log(`   OAuth 1.0a: ${process.env.TWITTER_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`   Test Mode: ${process.env.TWITTER_TEST_MODE === 'true' ? '✓ Enabled' : '✗ Disabled'}`);
  console.log(`   Build Dir: ${fs.existsSync(BUILD_DIR) ? '✓ Found' : '✗ Not Found'}`);
  console.log('====================================');
});

module.exports = server;