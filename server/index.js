import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './db.js';
import { seedIfEmpty } from './seed-on-startup.js';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import messageRoutes from './routes/messages.js';
import pushRoutes, { sendPushToUser } from './routes/push.js';
import uploadRoutes from './routes/uploads.js';
import boostRoutes from './routes/boost.js';
import adminRoutes from './routes/admin.js';
import { JWT_SECRET } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC  || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJgAMsJMVJZxCG5YPFP3ym5Rvxk';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || 'UUxI4O8-FbRouAevSmBQ6co62grotkR34GqTpu6-Ox4';
webpush.setVapidDetails('mailto:hello@swellswap.com', VAPID_PUBLIC, VAPID_PRIVATE);

// In production we serve frontend + API from the same origin, so CORS is permissive
const corsOpts = { origin: true, credentials: true };

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOpts });

app.use(cors(corsOpts));
app.use(express.json({ limit: '12mb' }));

// Serve uploaded images
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// In production, serve the built React app
if (isProd) {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/boost', boostRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/push/vapid-public-key', (_, res) => res.json({ key: VAPID_PUBLIC }));
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: Date.now() }));

// Clean up expired featured listings every hour
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE boards SET featured = 0, featured_until = 0 WHERE featured = 1 AND featured_until > 0 AND featured_until < ?').run(now);
}, 3600 * 1000);

// Socket.io
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

// Auto-seed demo data on first startup (idempotent — only runs if boards table is empty)
try { seedIfEmpty(); } catch (err) { console.error('Seed error:', err.message); }

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`SwellSwap server running on port ${PORT}`));
