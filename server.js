const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const WEB_DIR = path.join(__dirname, 'WebDownload');
const DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ricochet123';

function requireAdminAuth(headers = {}) {
  const authHeader =
    headers.authorization ||
    headers.Authorization ||
    headers.get?.('authorization') ||
    '';

  if (!authHeader.startsWith('Basic ')) {
    return false;
  }

  const encoded = authHeader.replace(/^Basic\s+/i, '');
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return false;
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

function unauthorizedResponse() {
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'WWW-Authenticate': 'Basic realm="Admin"',
    },
  });
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STATS_FILE)) {
    fs.writeFileSync(STATS_FILE, JSON.stringify({ visits: 0, downloads: 0 }, null, 2));
  }
}

function readStats() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(STATS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      visits: Number.isFinite(Number(parsed.visits)) ? Number(parsed.visits) : 0,
      downloads: Number.isFinite(Number(parsed.downloads)) ? Number(parsed.downloads) : 0,
    };
  } catch (error) {
    return { visits: 0, downloads: 0 };
  }
}

function writeStats(nextStats) {
  ensureDataFile();
  const safeStats = {
    visits: Math.max(0, Number(nextStats.visits) || 0),
    downloads: Math.max(0, Number(nextStats.downloads) || 0),
  };
  fs.writeFileSync(STATS_FILE, JSON.stringify(safeStats, null, 2));
  return safeStats;
}

function resetStats() {
  writeStats({ visits: 0, downloads: 0 });
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.apk': 'application/vnd.android.package-archive',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.wasm': 'application/wasm',
  };
  return types[ext] || 'application/octet-stream';
}

function safeFilePath(requestPath) {
  const relativePath = (requestPath === '/' ? '/index.html' : requestPath).replace(/^\/+/, '');
  const baseDir = path.resolve(WEB_DIR);
  const targetPath = path.resolve(baseDir, relativePath);
  if (!targetPath.startsWith(baseDir)) {
    return null;
  }
  return targetPath;
}

function makeApp() {
  async function request(input, init = {}) {
    const requestUrl = new URL(input, 'http://localhost');
    const pathname = requestUrl.pathname;
    const headers = init.headers || {};

    if (pathname === '/api/reset' || pathname === '/admin' || pathname === '/admin/') {
      if (!requireAdminAuth(headers)) {
        return unauthorizedResponse();
      }
    }

    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/stats') {
        return Response.json(readStats());
      }

      if (pathname === '/api/reset') {
        const next = writeStats({ visits: 0, downloads: 0 });
        return Response.json({ ok: true, stats: next });
      }

      if (pathname === '/api/track/visit') {
        const current = readStats();
        const next = writeStats({ ...current, visits: current.visits + 1 });
        return Response.json(next);
      }

      if (pathname === '/api/track/download') {
        const current = readStats();
        const next = writeStats({ ...current, downloads: current.downloads + 1 });
        return Response.json(next);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (pathname === '/admin' || pathname === '/admin/') {
      const adminPath = path.join(WEB_DIR, 'admin.html');
      if (fs.existsSync(adminPath) && fs.statSync(adminPath).isFile()) {
        const buffer = fs.readFileSync(adminPath);
        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }
      return new Response('Admin page not found', { status: 404 });
    }

    const filePath = safeFilePath(pathname);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new Response('Not Found', { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': getMimeType(filePath),
        'Cache-Control': 'no-store',
      },
    });
  }

  return { request };
}

function startServer(port = Number(process.env.PORT || 3000)) {
  const app = makeApp();
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = req.url || '/';
      const response = await app.request(requestUrl, {
        method: req.method || 'GET',
        headers: req.headers,
      });
      const headers = Object.fromEntries(response.headers.entries());

      res.writeHead(response.status, headers);
      if (response.body) {
        const chunks = [];
        for await (const chunk of response.body) {
          chunks.push(chunk);
        }
        res.end(Buffer.concat(chunks));
        return;
      }
      res.end();
    } catch (error) {
      console.error('Request failed:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  });

  server.listen(port, () => {
    console.log(`Ricochet download server running at http://localhost:${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { makeApp, readStats, writeStats, resetStats, startServer };
