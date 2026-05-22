// MINIMAL boot: start listening IMMEDIATELY, then load everything else lazily
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';

console.log('▶ Boot start. Node:', process.version, 'NODE_ENV:', process.env.NODE_ENV, 'PORT:', process.env.PORT);

process.on('uncaughtException',  (err) => console.error('💥 UNCAUGHT:', err.stack || err));
process.on('unhandledRejection', (err) => console.error('💥 REJECTION:', err));

const app = express();
const httpServer = createServer(app);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: Date.now() }));
app.get('/api/ping',   (_, res) => res.send('pong'));

const PORT = parseInt(process.env.PORT, 10) || 3001;
console.log(`▶ Listening on 0.0.0.0:${PORT}`);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✓✓✓ LIVE on 0.0.0.0:${PORT}`);
  loadFullApp().catch(err => console.error('💥 Failed to load full app:', err.stack || err));
});

httpServer.on('error', (err) => console.error('💥 SERVER ERROR:', err));

async function loadFullApp() {
  console.log('▶ Loading full app...');

  const { Server }      = await import('socket.io');
  const cors            = (await import('cors')).default;
  const jwt             = (await import('jsonwebtoken')).default;
  const webpush         = (await import('web-push')).default;
  const { v4: uuid }    = await import('uuid');
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const { existsSync, mkdirSync } = await import('fs');

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const isProd = process.env.NODE_ENV === 'production';

  const uploadsDir = join(__dirname, 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
    console.log('✓ Created uploads dir');
  }

  console.log('▶ Loading database...');
  const sql = (await import('./db.js')).default;
  console.log('✓ Database connected');

  console.log('▶ Running schema migration...');
  const { readFileSync } = await import('fs');
  const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await sql.unsafe(schemaSQL);
  console.log('✓ Schema is up to date');

  console.log('▶ Loading routes...');
  const authRoutes    = (await import('./routes/auth.js')).default;
  const boardRoutes   = (await import('./routes/boards.js')).default;
  const messageRoutes = (await import('./routes/messages.js')).default;
  const pushModule    = await import('./routes/push.js');
  const pushRoutes    = pushModule.default;
  const sendPushToUser = pushModule.sendPushToUser;
  const uploadRoutes  = (await import('./routes/uploads.js')).default;
  const boostRoutes   = (await import('./routes/boost.js')).default;
  const adminRoutes   = (await import('./routes/admin.js')).default;
  const { JWT_SECRET } = await import('./middleware/auth.js');
  console.log('✓ Routes loaded');

  const VAPID_PUBLIC  = process.env.VAPID_PUBLIC  || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJgAMsJMVJZxCG5YPFP3ym5Rvxk';
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE || 'UUxI4O8-FbRouAevSmBQ6co62grotkR34GqTpu6-Ox4';
  webpush.setVapidDetails('mailto:hello@swellswap.com', VAPID_PUBLIC, VAPID_PRIVATE);

  const corsOpts = { origin: true, credentials: true };
  const io = new Server(httpServer, { cors: corsOpts });

  app.use(cors(corsOpts));
  app.use(express.json({ limit: '12mb' }));
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api/auth',     authRoutes);
  app.use('/api/boards',   boardRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/push',     pushRoutes);
  app.use('/api/upload',   uploadRoutes);
  app.use('/api/boost',    boostRoutes);
  app.use('/api/admin',    adminRoutes);
  app.get('/api/push/vapid-public-key', (_, res) => res.json({ key: VAPID_PUBLIC }));

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
      console.warn('⚠ dist/ not found at', distPath);
    }
  }

  app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  });

  // Socket.io
  const userSockets = new Map();
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try { socket.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { next(new Error('Invalid token')); }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    const convos = await sql`SELECT id FROM conversations WHERE buyer_id = ${userId} OR seller_id = ${userId}`;
    convos.forEach(c => socket.join(`convo:${c.id}`));

    socket.on('send_message', async ({ conversation_id, content }) => {
      if (!content?.trim()) return;
      const [convo] = await sql`SELECT * FROM conversations WHERE id = ${conversation_id}`;
      if (!convo || (convo.buyer_id !== userId && convo.seller_id !== userId)) return;

      const id = uuid();
      await sql`INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (${id}, ${conversation_id}, ${userId}, ${content.trim()})`;
      const [message] = await sql`
        SELECT m.*, u.username as sender_name, u.avatar_color as sender_color
        FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ${id}
      `;
      io.to(`convo:${conversation_id}`).emit('new_message', message);

      const recipientId = convo.buyer_id === userId ? convo.seller_id : convo.buyer_id;
      const isOnline = userSockets.has(recipientId) && userSockets.get(recipientId).size > 0;
      if (!isOnline) {
        const [board] = await sql`SELECT title FROM boards WHERE id = ${convo.board_id}`;
        await sendPushToUser(recipientId, {
          title: `New message from ${socket.user.username}`,
          body:  content.length > 80 ? content.slice(0, 80) + '...' : content,
          data:  { conversation_id, board_title: board?.title },
          icon:  '/icon-192.png',
        });
      }
    });

    socket.on('start_conversation', async ({ board_id }, callback) => {
      const [board] = await sql`SELECT * FROM boards WHERE id = ${board_id}`;
      if (!board || board.user_id === userId) return callback?.({ error: 'Invalid' });

      let [convo] = await sql`SELECT * FROM conversations WHERE buyer_id = ${userId} AND board_id = ${board_id}`;
      if (!convo) {
        const id = uuid();
        await sql`INSERT INTO conversations (id, buyer_id, seller_id, board_id) VALUES (${id}, ${userId}, ${board.user_id}, ${board_id})`;
        [convo] = await sql`SELECT * FROM conversations WHERE id = ${id}`;
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

  // Seed if empty (best-effort, never crashes)
  try {
    const seed = await import('./seed-on-startup.js');
    await seed.seedIfEmpty();
  } catch (err) {
    console.error('Seed failed (non-fatal):', err.message);
  }

  // Cleanup expired featured listings hourly
  setInterval(async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      await sql`UPDATE boards SET featured = FALSE, featured_until = 0 WHERE featured = TRUE AND featured_until > 0 AND featured_until < ${now}`;
    } catch {}
  }, 3600 * 1000);

  console.log('✓✓✓ Full app ready');
}
