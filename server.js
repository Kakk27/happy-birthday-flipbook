const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const AUDIO_DIR = path.join(__dirname, 'audio');
const IMAGE_DIR = path.join(__dirname, 'image');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure necessary directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

// Default database schema
const DEFAULT_DB = {
  settings: {
    name: 'Li Engg',
    nick: 'my beloved',
    age: 23,
    date: '2026-10-26',
    from: '',
    letter: "Thank you for every little moment, every laugh, and every memory we've shared. I hope this year is gentle with you and brings you closer to everything you've been wishing for. Stay healthy, stay happy, and keep being the amazing person you are."
  },
  photos: {},
  audio: {
    track: 'box',
    vol: 0.6,
    music: true,
    sfx: true,
    customTrack: null,
    customTrackName: null
  },
  lock: false,
  updatedAt: Date.now()
};

// Load or initialize database
let db = Object.assign({}, DEFAULT_DB);
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    db = {
      settings: Object.assign({}, DEFAULT_DB.settings, parsed.settings || {}),
      photos: Object.assign({}, parsed.photos || {}),
      audio: Object.assign({}, DEFAULT_DB.audio, parsed.audio || {}),
      lock: typeof parsed.lock === 'boolean' ? parsed.lock : DEFAULT_DB.lock,
      updatedAt: parsed.updatedAt || Date.now()
    };
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  }
} catch (err) {
  console.error('[DB] Error loading database.json, using defaults:', err);
}

function saveDb() {
  try {
    db.updatedAt = Date.now();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[DB] Error saving database.json:', err);
    return false;
  }
}

// SSE Clients for live synchronization
const sseClients = new Set();

function broadcastSync(payload) {
  const data = JSON.stringify(payload || { type: 'sync', data: db });
  const msg = `data: ${data}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// SSE keep-alive interval
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(':ping\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 20000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
};

const server = http.createServer((req, res) => {
  // CORS & general API headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename, X-Slot');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURI(parsedUrl.pathname);

  // 1. GET /api/data - Return database records
  if (req.method === 'GET' && pathname === '/api/data') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return res.end(JSON.stringify(db));
  }

  // 2. GET /api/sync - Server-Sent Events stream for real-time synchronization
  if (req.method === 'GET' && pathname === '/api/sync') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify({ type: 'init', data: db })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 3. POST /api/save - Update database records from admin
  if (req.method === 'POST' && pathname === '/api/save') {
    let bodyStr = '';
    req.on('data', chunk => {
      bodyStr += chunk;
      // 50MB safety limit for large photo collections
      if (bodyStr.length > 50 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        if (body.settings && typeof body.settings === 'object') {
          db.settings = Object.assign({}, db.settings, body.settings);
        }
        if (body.photos && typeof body.photos === 'object') {
          db.photos = Object.assign({}, db.photos, body.photos);
        }
        if (body.audio && typeof body.audio === 'object') {
          db.audio = Object.assign({}, db.audio, body.audio);
        }
        if (typeof body.lock === 'boolean') {
          db.lock = body.lock;
        }

        saveDb();
        broadcastSync({ type: 'sync', data: db });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, data: db }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON body', details: err.message }));
      }
    });
    return;
  }

  // 4. POST /api/upload-audio - Upload audio file and store in audio/ directory
  if (req.method === 'POST' && pathname === '/api/upload-audio') {
    let rawFilename = req.headers['x-filename'] || parsedUrl.searchParams.get('filename') || 'custom_bgm.mp3';
    try {
      rawFilename = decodeURIComponent(rawFilename);
    } catch (e) {}

    const originalName = path.basename(rawFilename);
    const ext = (path.extname(originalName) || '.mp3').toLowerCase();
    const baseClean = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1780-\u17FF]/g, '_').slice(0, 40) || 'track';
    const safeFilename = `${baseClean}_${Date.now()}${ext}`;
    const targetFilePath = path.join(AUDIO_DIR, safeFilename);

    const writeStream = fs.createWriteStream(targetFilePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const publicUrl = `/audio/${encodeURIComponent(safeFilename)}`;
      
      // Update database with the new custom background music
      db.audio.customTrack = publicUrl;
      db.audio.customTrackName = originalName;
      db.audio.track = 'custom';
      db.audio.music = true;
      saveDb();

      // Broadcast update to all connected user and admin clients
      broadcastSync({ type: 'sync', data: db });

      console.log(`[Audio Upload] Stored: ${targetFilePath} (${originalName})`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        url: publicUrl,
        name: originalName,
        audio: db.audio
      }));
    });

    writeStream.on('error', (err) => {
      console.error('[Audio Upload Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to save audio file', details: err.message }));
    });
    return;
  }

  // 5. POST /api/upload-image - Upload image file and store in image/ directory
  if (req.method === 'POST' && pathname === '/api/upload-image') {
    let slot = req.headers['x-slot'] || parsedUrl.searchParams.get('slot') || 'photo';
    slot = slot.replace(/[^a-zA-Z0-9_\-]/g, '') || 'photo';

    let rawFilename = req.headers['x-filename'] || parsedUrl.searchParams.get('filename') || `${slot}.jpg`;
    try {
      rawFilename = decodeURIComponent(rawFilename);
    } catch (e) {}

    const originalName = path.basename(rawFilename);
    const ext = (path.extname(originalName) || '.jpg').toLowerCase();
    const safeFilename = `${slot}_${Date.now()}${ext}`;
    const targetFilePath = path.join(IMAGE_DIR, safeFilename);

    const writeStream = fs.createWriteStream(targetFilePath);

    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      let finalFilename = safeFilename;
      let finalFilePath = targetFilePath;
      if (ext === '.heic' || ext === '.heif') {
        try {
          const heicConvert = require('heic-convert');
          const inputBuf = fs.readFileSync(targetFilePath);
          const outputBuf = await heicConvert({ buffer: inputBuf, format: 'JPEG', quality: 0.85 });
          finalFilename = `${slot}_${Date.now()}.jpg`;
          finalFilePath = path.join(IMAGE_DIR, finalFilename);
          fs.writeFileSync(finalFilePath, Buffer.from(outputBuf));
          try { fs.unlinkSync(targetFilePath); } catch (e) {}
          console.log(`[HEIC Converted to JPEG] ${finalFilePath}`);
        } catch (convErr) {
          console.error('[HEIC Convert Error]', convErr);
        }
      }
      const publicUrl = `/image/${encodeURIComponent(finalFilename)}`;
      
      // Update database with the new photo URL for this slot
      db.photos[slot] = publicUrl;
      saveDb();

      // Broadcast update to all connected user and admin clients
      broadcastSync({ type: 'sync', data: db });

      console.log(`[Image Upload] Stored: ${finalFilePath} for slot [${slot}]`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        url: publicUrl,
        slot: slot,
        photos: db.photos
      }));
    });

    writeStream.on('error', (err) => {
      console.error('[Image Upload Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to save image file', details: err.message }));
    });
    return;
  }

  // 6. Static File Serving with HTTP Range support for audio streaming
  let reqUrl = pathname;
  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/index.html';
  }
  // Clean URL for admin panel
  if (reqUrl === '/admin' || reqUrl === '/admin/') {
    reqUrl = '/admin.html';
  }

  const safePath = path.normalize(path.join(__dirname, reqUrl));

  // Security: Prevent directory traversal
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const totalSize = stats.size;
    const range = req.headers.range;

    // HEAD request support (e.g. for audio headers check)
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': totalSize,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });
      return res.end();
    }

    // HTTP 206 Partial Content support for audio/media streaming
    if (range && (contentType.startsWith('audio/') || contentType.startsWith('video/'))) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${totalSize}`,
          'Content-Type': 'text/plain'
        });
        return res.end('416 Requested Range Not Satisfiable');
      }

      const chunkSize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });

      const stream = fs.createReadStream(safePath, { start, end });
      stream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': totalSize,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });

    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(` Birthday Flipbook Server is running!`);
  console.log(`========================================`);
  console.log(` > Flipbook (User):  http://localhost:${PORT}/`);
  console.log(` > Admin (Editor):   http://localhost:${PORT}/admin`);
  console.log(` > Database File:    ${DB_FILE}`);
  console.log(` > Audio Storage:    ${AUDIO_DIR}`);
  console.log(` > Image Storage:    ${IMAGE_DIR}`);
  console.log(`========================================\n`);
});
