// Aggressive error logging — capture anything Railway might hide
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err.stack || err);
});
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION:', err);
});

console.log('▶ Boot start. Node:', process.version, 'NODE_ENV:', process.env.NODE_ENV, 'PORT:', process.env.PORT);

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

// Make sure uploads folder exists before anything tries to write to it
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
  console.log('✓ Created uploads directory');
}

console.log('▶ Loading database module...');
const { default: db } = await import('./db.js');
console.log('✓ Database initialized');

console.log('▶ Loading routes...');
const { default: authRoutes }    = await import('./routes/auth.js');
const { default: boardRoutes }   = await import('./routes/boards.js');
const { default: messageRoutes } = await import('./routes/messages.js');
const { default: pushRoutes, sendPushToUser } = await import('./routes/push.js').then(m => ({ default: m.default, sendPushToUser: m.sendPushToUser }));
const { default: uploadRoutes }  = await import('./routes/uploads.js');
const { default: boostRoutes }   = await import('./routes/boost.js');
const { default: adminRoutes }   = await import('./routes/admin.js');
const { JWT_SECRET } = await import('./middleware/auth.js');
console.log('✓ All routes loaded');

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC  || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJgAMsJMVJZxCG5YPFP3ym5Rvxk';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || 'UUxI4O8-FbRouAevSmBQ6co62grotkR34GqTpu6-Ox4';
webpush.setVapidDetails('mailto:hello@swellswap.com', VAPID_PUBLIC, VAPID_PRIVATE);

const corsOpts = { origin: true, credentials: true };
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOpts });

app.use(cors(corsOpts));
app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(uploadsDir));

// Health check FIRST so Railway can detect it immediately
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: Date.now() }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/boost', boostRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/push/vapid-public-key', (_, res) => res.json({ key: VAPID_PUBLIC }));

// Production: serve built React app
if (isProd) {
  const distPath = join(__dirname, '../dist');
  if (existsSync(distPath)) {
    console.log('✓ Serving frontend from', distPath);
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(join(distPath, 'index.html'));
    });
  } else {
    console.warn('⚠ dist/ folder not found — frontend will not be served');
  }
}

// Express error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

// Socket.io setup
const userSockets = new Map();
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  try { socket.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket.id);

  const convos = db.prepare('SELECT id FROM conversations WHERE buyer_id = ? OR seller_id = ?').all(userId, userId);
  convos.forEach(c => socket.join(`convo:${c.id}`));

  socket.on('send_message', async ({ conversation_id, content }) => {
    if (!content?.trim()) return;
    const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversation_id);
    if (!convo || (convo.buyer_id !== userId && convo.seller_id !== userId)) return;
    const id = uuid();
    db.prepare('INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)').run(id, conversation_id, userId, content.trim());
    const message = db.prepare(`SELECT m.*, u.username as sender_name, u.avatar_color as sender_color FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`).get(id);
    io.to(`convo:${conversation_id}`).emit('new_message', message);

    const recipientId = convo.buyer_id === userId ? convo.seller_id : convo.buyer_id;
    const isOnline = userSockets.has(recipientId) && userSockets.get(recipientId).size > 0;
    if (!isOnline) {
      const board = db.prepare('SELECT title FROM boards WHERE id = ?').get(convo.board_id);
      await sendPushToUser(recipientId, {
        title: `New message from ${socket.user.username}`,
        body: content.length > 80 ? content.slice(0, 80) + '...' : content,
        data: { conversation_id, board_title: board?.title },
        icon: '/icon-192.png',
      });
    }
  });

  socket.on('start_conversation', ({ board_id }, callback) => {
    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(board_id);
    if (!board || board.user_id === userId) return callback?.({ error: 'Invalid' });
    let convo = db.prepare('SELECT * FROM conversations WHERE buyer_id = ? AND board_id = ?').get(userId, board_id);
    if (!convo) {
      const id = uuid();
      db.prepare('INSERT INTO conversations (id, buyer_id, seller_id, board_id) VALUES (?, ?, ?, ?)').run(id, userId, board.user_id, board_id);
      convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
      socket.join(`convo:${convo.id}`);
    }
    callback?.({ conversation: convo });
  });

  socket.on('typing', ({ conversation_id, isTyping }) => {
    socket.to(`convo:${conversation_id}`).emit('user_typing', { userId, isTyping });
  });

  socket.on('disconnect', () => {
    userSockets.get(userId)?.delete(socket.id);
    if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
  });
});

// Start listening IMMEDIATELY — before slower init work like seeding
const PORT = parseInt(process.env.PORT, 10) || 3001;
console.log(`▶ About to listen on 0.0.0.0:${PORT}`);

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`✓✓✓ SwellSwap server LIVE on 0.0.0.0:${PORT}`);

  // Run slower init after the server is already accepting connections
  try {
    const seedModule = await import('./seed-on-startup.js');
    seedModule.seedIfEmpty();
  } catch (err) {
    console.error('Seed error (non-fatal):', err.message);
  }

  // Cleanup interval
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    try {
      db.prepare('UPDATE boards SET featured = 0, featured_until = 0 WHERE featured = 1 AND featured_until > 0 AND featured_until < ?').run(now);
    } catch {}
  }, 3600 * 1000);
});

httpServer.on('error', (err) => {
  console.error('💥 SERVER ERROR:', err);
});
