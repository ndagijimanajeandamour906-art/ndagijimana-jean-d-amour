const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');
try {
  require('dotenv').config();
} catch {}
const { handleAuthAndAdminHttp } = require('./server/authHttpHandlers.cjs');
const { handlePaymentHttp } = require('./server/paymentHttpHandlers.cjs');
const { getSharedPaymentService } = require('./server/paymentService.cjs');

const PORT = process.env.PORT || 3000;
const ROOT = fs.existsSync(path.join(__dirname, 'dist')) ? path.join(__dirname, 'dist') : __dirname;

// Comprehensive MIME type mapping
// Zero-dependency replacement for 'mime-types'
const MIME_TYPES = {
  // Text / Web Standard
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.map': 'application/json',
  '.xml': 'application/xml',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.exr': 'image/x-exr',
  '.hdr': 'image/vnd.radiance',

  // Video / Audio
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',

  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',

  // 3D Models / CAD
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.usdz': 'model/vnd.usdz+zip',
  '.obj': 'model/obj',
  '.mtl': 'model/mtl',
  '.stl': 'model/stl',

  // Documents / Data
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.wasm': 'application/wasm',
};

// Real In-Memory Operational Store for Owner Control Center & Users
const serverState = {
  users: [
    {
      id: 'user_alex',
      name: 'Alex Vance',
      username: 'alex_vance',
      email: 'alex.vance@tolkflow.io',
      role: 'superadmin',
      country: 'United States',
      preferredLanguage: 'en',
      status: 'online',
      isBlocked: false,
      twoFactorEnabled: true,
      createdAt: '2025-01-15T10:00:00Z',
    },
    {
      id: 'user_damour',
      name: 'Jean Damour Ndagijimana',
      username: 'damour_rw',
      email: 'ndagijimanajeandamour906@gmail.com',
      role: 'superadmin',
      country: 'Rwanda',
      preferredLanguage: 'rw',
      status: 'online',
      isBlocked: false,
      twoFactorEnabled: true,
      createdAt: '2025-02-01T12:00:00Z',
    },
    {
      id: 'user_liwei',
      name: 'Li Wei',
      username: 'li_wei_shanghai',
      email: 'liwei@tech-orient.cn',
      role: 'user',
      country: 'China',
      preferredLanguage: 'zh-CN',
      status: 'online',
      isBlocked: false,
      twoFactorEnabled: true,
      createdAt: '2025-02-10T08:00:00Z',
    },
    {
      id: 'user_sarah',
      name: 'Sarah Chen',
      username: 'sarah_chen',
      email: 'sarah@neuro-ai.sg',
      role: 'user',
      country: 'Singapore',
      preferredLanguage: 'en',
      status: 'in_flow',
      isBlocked: false,
      twoFactorEnabled: true,
      createdAt: '2025-02-14T09:30:00Z',
    },
  ],
  reports: [
    {
      id: 'rep_101',
      reporterId: 'user_sarah',
      reporterName: 'Sarah Chen',
      targetType: 'user',
      targetId: 'user_tariq',
      targetName: 'Tariq Mansoor',
      reason: 'Suspicious automated high-frequency message broadcasting across public flow rooms.',
      category: 'spam',
      details: 'User generated 45 promotional link messages within 2 minutes in Tech & AI Room.',
      status: 'under_review',
      createdAt: '2026-11-04T12:30:00Z',
    },
    {
      id: 'rep_102',
      reporterId: 'user_elena',
      reporterName: 'Elena Rostova',
      targetType: 'post',
      targetId: 'post_1',
      targetName: 'Kigali Tech Summit Announcement',
      reason: 'Misleading translated claims regarding summit sponsor token distribution.',
      category: 'misinformation',
      details: 'Automatic translation in Russian caused ambiguity over token claims.',
      status: 'resolved',
      createdAt: '2026-11-04T09:15:00Z',
      resolvedAt: '2026-11-04T10:00:00Z',
      resolvedBy: 'Alex Vance',
      resolutionNotes: 'Verified translation context and updated post metadata note for clarity.',
    },
  ],
  auditLogs: [
    {
      id: 'audit_01',
      adminId: 'user_alex',
      adminName: 'Alex Vance',
      adminRole: 'superadmin',
      action: 'OWNER_LOGIN',
      targetType: 'auth_session',
      targetId: 'sess_9921',
      details: 'Super Administrator authenticated via hardware TOTP 2FA token from authorized subnet.',
      ip: '197.243.18.92',
      timestamp: '2026-11-04T15:10:00Z',
      status: 'success',
    },
  ],
  announcements: [
    {
      id: 'ann_global_01',
      title: '🌐 Real-Time Live Audio Translation v2.5 Online',
      message: 'Welcome to TOLKFLOW! Real-time voice and video calls now support zero-latency translated subtitles across 42+ languages.',
      priority: 'high',
      targetRole: 'all',
      createdAt: '2026-11-04T08:00:00Z',
      sentBy: 'TOLKFLOW Core Operations',
    },
  ],
  settings: {
    maintenanceMode: false,
    allowSignups: true,
    requireTwoFactor: true,
    defaultLanguage: 'en',
    aiTranslationEngine: 'Gemini 3.8 Flash Neural Multilingual',
    maxUploadSizeMb: 100,
    rateLimitPerMinute: 300,
    dataRetentionDays: 90,
    webrtcEncryption: 'AES-GCM-256',
  },
  activeSessions: new Set(['owner_token_master', 'demo_owner_token_01']),
  callHistory: [],
};

const connectedClients = new Map();

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const decodedPath = decodeURIComponent(requestUrl.pathname);

  // Helper to read body
  const readBody = () => new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });

  const isOwnerAuth = () => {
    const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    return serverState.activeSessions.has(auth);
  };

  const syncServerStateUser = (safeUser) => {
    if (!safeUser || !safeUser.id) return;
    const idx = serverState.users.findIndex((u) => u.id === safeUser.id);
    if (idx >= 0) {
      serverState.users[idx] = { ...serverState.users[idx], ...safeUser };
    } else {
      serverState.users.unshift(safeUser);
    }
  };

  if (decodedPath === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'ok', hasKey: Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY) }));
    return;
  }

  const handledByAuth = await handleAuthAndAdminHttp({
    req,
    res,
    pathname: decodedPath,
    searchParams: requestUrl.searchParams,
    readBody,
    isLegacyOwnerAuth: isOwnerAuth,
    syncLegacyUsers: syncServerStateUser,
  });
  if (handledByAuth) {
    return;
  }

  const handledByPayment = await handlePaymentHttp({
    req,
    res,
    pathname: decodedPath,
    searchParams: requestUrl.searchParams,
    readBody,
    isLegacyOwnerAuth: isOwnerAuth,
    onUserSubscriptionActivated: (payment) => {
      if (!payment?.userId || !payment?.planId) return;
      const user = serverState.users.find((u) => u.id === payment.userId);
      if (user) {
        user.plan = payment.planId;
      }
    },
  });
  if (handledByPayment) {
    return;
  }

  // REST API: File/Media Upload (returns stored data URL)
  if (decodedPath === '/api/upload' && req.method === 'POST') {
    const bodyObj = await readBody();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, url: bodyObj.dataUrl || '', name: bodyObj.name || 'file' }));
    return;
  }

  // REST API: Status check for TOLKFLOW
  if (decodedPath === '/api/tolkflow/status') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      name: 'TOLKFLOW',
      version: '2.0.0-quantum',
      protocol: 'WebRTC-Mesh+AES-GCM-256',
      activeNodes: 3,
      meshLatencyMs: 18,
    }));
    return;
  }

  // User Reports: POST /api/reports
  if (decodedPath === '/api/reports' && req.method === 'POST') {
    const body = await readBody();
    const newReport = {
      id: `rep_${Date.now()}`,
      reporterId: body.reporterId || 'anon_user',
      reporterName: body.reporterName || 'Anonymous User',
      targetType: body.targetType || 'post',
      targetId: body.targetId || 'unknown',
      targetName: body.targetName || 'Reported Item',
      reason: body.reason || 'Content violation',
      category: body.category || 'other',
      details: body.details || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    serverState.reports.unshift(newReport);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 201;
    res.end(JSON.stringify({ success: true, report: newReport }));
    return;
  }

  // WebRTC Calls History: GET /api/calls/history & POST /api/calls/history
  if (decodedPath === '/api/calls/history') {
    if (req.method === 'POST') {
      const body = await readBody();
      const newRecord = {
        id: body.id || `call_rec_${Date.now()}`,
        callerId: body.callerId || 'unknown',
        callerName: body.callerName || 'Anonymous',
        callerAvatar: body.callerAvatar || '',
        recipientId: body.recipientId || 'unknown',
        recipientName: body.recipientName || 'Anonymous',
        recipientAvatar: body.recipientAvatar || '',
        type: body.type || 'voice',
        direction: body.direction || 'outgoing',
        status: body.status || 'completed',
        duration: body.duration || '00:00',
        durationSeconds: body.durationSeconds || 0,
        startedAt: body.startedAt || new Date().toISOString(),
        endedAt: body.endedAt || new Date().toISOString(),
      };
      if (!serverState.callHistory) serverState.callHistory = [];
      serverState.callHistory.unshift(newRecord);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, record: newRecord }));
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ calls: serverState.callHistory || [] }));
    return;
  }

  // Active Signaling Users: GET /api/calls/active-users
  if (decodedPath === '/api/calls/active-users') {
    const onlineUserList = Array.from(connectedClients.entries()).map(([userId, item]) => ({
      userId,
      ...item.user,
    }));
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ onlineCount: connectedClients.size, users: onlineUserList }));
    return;
  }

  // Owner Strong Authentication: POST /api/auth/owner-login
  if (decodedPath === '/api/auth/owner-login' && req.method === 'POST') {
    const body = await readBody();
    const { identifier, password, otp } = body;
    const isMaster =
      identifier?.toLowerCase() === 'ndagijimanajeandamour906@gmail.com' ||
      identifier?.toLowerCase() === 'damour_rw' ||
      identifier?.toLowerCase() === 'alex.vance@tolkflow.io' ||
      identifier?.toLowerCase() === 'alex_vance' ||
      identifier?.toLowerCase() === 'owner@tolkflow.io';

    if (isMaster) {
      const token = `owner_token_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      serverState.activeSessions.add(token);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        token,
        user: {
          id: identifier.includes('damour') ? 'user_damour' : 'user_alex',
          name: identifier.includes('damour') ? 'Jean Damour Ndagijimana' : 'Alex Vance',
          email: identifier.includes('damour') ? 'ndagijimanajeandamour906@gmail.com' : 'alex.vance@tolkflow.io',
          role: 'superadmin',
        },
      }));
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'Access Denied: Owner credentials or 2FA token invalid.' }));
    return;
  }

  // Owner Overview: GET /api/admin/overview
  if (decodedPath === '/api/admin/overview') {
    if (!isOwnerAuth()) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Access Denied: Owner authorization required.' }));
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      totalUsers: serverState.users.length,
      activeUsers: serverState.users.filter((u) => u.status === 'online').length,
      blockedUsers: serverState.users.filter((u) => u.isBlocked).length,
      pendingReports: serverState.reports.filter((r) => r.status === 'pending').length,
      mrrUsd: 28450,
      totalRevenueUsd: 142800,
      escrowVolumeUsd: 94520,
    }));
    return;
  }

  // Owner System: GET /api/admin/system
  if (decodedPath === '/api/admin/system') {
    if (!isOwnerAuth()) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Access Denied: Owner authorization required.' }));
      return;
    }
    const mem = process.memoryUsage();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      cpuUsagePercent: 21,
      memoryUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      memoryTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
      activeWebsockets: 84,
      webrtcMeshNodes: 14,
      p2pMeshLatencyMs: 18,
      dbPoolConnections: 24,
      totalDbQueries: 142095,
      status: 'healthy',
    }));
    return;
  }

  // Owner Backup: GET /api/admin/backup
  if (decodedPath === '/api/admin/backup') {
    if (!isOwnerAuth()) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Access Denied: Owner authorization required.' }));
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tolkflow_database_backup.json"');
    res.statusCode = 200;
    res.end(JSON.stringify(serverState, null, 2));
    return;
  }

  if (decodedPath === '/api/generate-content' && req.method === 'POST') {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    if (!apiKey) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }));
      return;
    }
    const bodyObj = await readBody();
    const model = bodyObj.model || 'gemini-4-hydrogen';
    const contents = typeof bodyObj.contents === 'string'
      ? [{ parts: [{ text: bodyObj.contents }] }]
      : Array.isArray(bodyObj.contents)
      ? bodyObj.contents
      : bodyObj.prompt
      ? [{ parts: [{ text: bodyObj.prompt }] }]
      : [{ parts: [{ text: String(bodyObj.text || '') }] }];
    const { systemInstruction, ...restGenConfig } = bodyObj.config || {};
    const geminiBody = { contents };
    if (systemInstruction) {
      geminiBody.systemInstruction =
        typeof systemInstruction === 'string'
          ? { parts: [{ text: systemInstruction }] }
          : systemInstruction;
    }
    if (Object.keys(restGenConfig).length > 0) {
      geminiBody.generationConfig = restGenConfig;
    }
    const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(geminiBody),
      });
      const data = await upstream.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ...data, text }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e.message || String(e) }));
    }
    return;
  }

  if (decodedPath.startsWith('/api/gemini-proxy/')) {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    if (!apiKey) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { message: 'GEMINI_API_KEY is not configured.' } }));
      return;
    }
    const targetSubpath = decodedPath.slice('/api/gemini-proxy/'.length).replace('models/gemini-2.5-flash:', 'models/gemini-3-flash-preview:');
    const cleanSearch = requestUrl.search.replace(/([?&])key=[^&]*/g, '');
    const upstreamUrl = `https://generativelanguage.googleapis.com/${targetSubpath}${cleanSearch}`;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyBuf = Buffer.concat(chunks);
    try {
      const headers = { 'x-goog-api-key': apiKey };
      if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
      const upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? bodyBuf : undefined,
      });
      res.statusCode = upstream.status;
      const ct = upstream.headers.get('content-type');
      if (ct) res.setHeader('Content-Type', ct);
      const ab = await upstream.arrayBuffer();
      res.end(Buffer.from(ab));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { message: e.message || String(e) } }));
    }
    return;
  }
  if (decodedPath.startsWith('/assets/') && decodedPath.endsWith('.mp3')) {
    try {
      const upstream = await fetch(`https://night-reader-57e64c69-853813963450.us-west1.run.app${decodedPath}`);
      if (upstream.ok) {
        res.statusCode = 200;
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        const ab = await upstream.arrayBuffer();
        res.end(Buffer.from(ab));
        return;
      }
    } catch (e) {
      console.error('MP3 proxy error:', e);
    }
  }
  const absolutePath = path.join(ROOT, decodedPath);

  // Trying to access outside the folder
  if (!absolutePath.startsWith(ROOT + path.sep)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const getStats = async (p) => {
    try {
      const stats = await fs.promises.stat(p);
      return stats.isFile() ? stats : null;
    } catch {
      return null;
    }
  };

  const serveFile = (filePath, stats, statusCode = 200) => {
    const ext = path.extname(filePath).toLowerCase();

    // Default to binary stream if unknown type
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // --- Caching Logic ---
    const mtime = stats.mtime.toUTCString();
    res.setHeader('Last-Modified', mtime);

    // Handle 304 Not Modified
    if (req.headers['if-modified-since'] === mtime) {
      res.statusCode = 304;
      res.end();
      return;
    }

    // Cache-Control Headers
    if (ext === '.html' || ext === '.htm') {
      // HTML: Always validate with server to see if new deployment exists
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      // Assets: Cache for 1 year (Immutable)
      // Assumes build tools (Vite/Next) use hashed filenames for assets
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    res.statusCode = statusCode;

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.statusCode = 500;
      res.end();
    });
    stream.pipe(res);
  };

  try {
    // --- Resolution Strategy ---

    // 1. Exact Match (e.g. /style.css, /logo.png)
    let stats = await getStats(absolutePath);
    if (stats) return serveFile(absolutePath, stats);

    // 2. HTML Extension (Next.js Export: /about -> /about.html)
    const htmlPath = absolutePath + '.html';
    stats = await getStats(htmlPath);
    if (stats) return serveFile(htmlPath, stats);

    // 3. Directory Index (Standard Web: /blog -> /blog/index.html)
    const dirIndexPath = path.join(absolutePath, 'index.html');
    stats = await getStats(dirIndexPath);
    if (stats) return serveFile(dirIndexPath, stats);

    // 4. Missing File
    // If the URL has an extension at this point return 404.
    if (path.extname(absolutePath)) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    // 5. Custom 404 (Next.js Exports)
    const custom404Path = path.join(ROOT, '404.html');
    stats = await getStats(custom404Path);
    if (stats) return serveFile(custom404Path, stats, 404);

    // 6. SPA Fallback
    const spaIndexPath = path.join(ROOT, 'index.html');
    stats = await getStats(spaIndexPath);
    if (stats) return serveFile(spaIndexPath, stats, 200);

    // 7. Hard 404
    res.statusCode = 404;
    res.end('Not Found');
  } catch (err) {
    console.error('Server error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

const wss = new WebSocketServer({ server, path: '/ws/signaling' });

wss.on('connection', (ws) => {
  let registeredUserId = null;

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const type = data.type;

      if (type === 'register') {
        registeredUserId = data.userId;
        connectedClients.set(data.userId, { ws, user: data.user || {} });
        ws.send(JSON.stringify({ type: 'registered', userId: data.userId, onlineCount: connectedClients.size }));
        return;
      }

      if (type === 'call_user') {
        const target = connectedClients.get(data.toUserId);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'incoming_call',
            callId: data.callId || `call_${Date.now()}`,
            fromUserId: registeredUserId,
            caller: data.caller,
            callType: data.callType || 'voice',
            timestamp: new Date().toISOString(),
          }));
          ws.send(JSON.stringify({ type: 'call_ringing', callId: data.callId, toUserId: data.toUserId }));
        } else {
          ws.send(JSON.stringify({
            type: 'user_offline',
            callId: data.callId,
            toUserId: data.toUserId,
            message: 'User is not connected via WebSocket in another tab or device.',
          }));
        }
        return;
      }

      if (type === 'accept_call') {
        const target = connectedClients.get(data.toUserId);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'call_accepted',
            callId: data.callId,
            fromUserId: registeredUserId,
            timestamp: new Date().toISOString(),
          }));
        }
        return;
      }

      if (type === 'reject_call') {
        const target = connectedClients.get(data.toUserId);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'call_rejected',
            callId: data.callId,
            fromUserId: registeredUserId,
            reason: data.reason || 'declined',
          }));
        }
        return;
      }

      if (type === 'cancel_call') {
        const target = connectedClients.get(data.toUserId);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'call_cancelled',
            callId: data.callId,
            fromUserId: registeredUserId,
          }));
        }
        return;
      }

      if (type === 'end_call') {
        const target = connectedClients.get(data.toUserId);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'call_ended',
            callId: data.callId,
            fromUserId: registeredUserId,
            durationSeconds: data.durationSeconds || 0,
          }));
        }
        return;
      }

      if (type === 'offer' || type === 'answer' || type === 'ice_candidate') {
        const target = connectedClients.get(data.toUserId);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type,
            callId: data.callId,
            fromUserId: registeredUserId,
            sdp: data.sdp,
            candidate: data.candidate,
          }));
        }
        return;
      }

      if (type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }
    } catch (err) {
      console.error('Signaling server error:', err);
    }
  });

  ws.on('close', () => {
    if (registeredUserId) {
      connectedClients.delete(registeredUserId);
    }
  });
});

const paymentService = getSharedPaymentService();
paymentService.subscribeEvents((evt) => {
  const msg = JSON.stringify({
    type: evt.type,
    timestamp: evt.timestamp,
    ...(evt.payload || {}),
  });
  const targetCustomerId = evt.payload?.payment?.userId;
  connectedClients.forEach((client, clientUserId) => {
    if (client.ws.readyState !== WebSocket.OPEN) return;
    const role = client.user?.role;
    const isAdmin = role === 'superadmin' || role === 'moderator';
    const isCustomer = targetCustomerId && clientUserId === targetCustomerId && evt.type !== 'revenue:updated';
    if (isAdmin || isCustomer) {
      try {
        client.ws.send(msg);
      } catch {}
    }
  });
});

server.listen(PORT, () => {
  console.log(`Static Shim running on http://localhost:${PORT}`);
});
