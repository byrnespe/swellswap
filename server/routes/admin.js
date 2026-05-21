import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function requireAdmin(req, res, next) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
  if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// GET dashboard stats
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  const totalUsers    = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const totalBoards   = db.prepare("SELECT COUNT(*) as n FROM boards").get().n;
  const activeBoards  = db.prepare("SELECT COUNT(*) as n FROM boards WHERE status = 'active'").get().n;
  const totalMessages = db.prepare('SELECT COUNT(*) as n FROM messages').get().n;
  const totalBoosts   = db.prepare('SELECT COUNT(*) as n FROM boost_orders').get().n;
  const revenue       = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM boost_orders').get().total;
  const newUsersToday = db.prepare('SELECT COUNT(*) as n FROM users WHERE created_at > unixepoch() - 86400').get().n;
  const newBoardsToday = db.prepare("SELECT COUNT(*) as n FROM boards WHERE created_at > unixepoch() - 86400").get().n;

  res.json({ totalUsers, totalBoards, activeBoards, totalMessages, totalBoosts, revenue, newUsersToday, newBoardsToday });
});

// GET all boards (with seller info)
router.get('/boards', requireAuth, requireAdmin, (req, res) => {
  const boards = db.prepare(`
    SELECT b.*, u.username as seller_name, u.email as seller_email
    FROM boards b JOIN users u ON b.user_id = u.id
    ORDER BY b.created_at DESC LIMIT 100
  `).all();
  boards.forEach(b => { b.trade = b.trade === 1; b.featured = b.featured === 1; });
  res.json(boards);
});

// GET all users
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.location, u.role, u.created_at, u.avatar_color,
      (SELECT COUNT(*) FROM boards WHERE user_id = u.id) as board_count,
      (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) as message_count
    FROM users u ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// DELETE (remove) a board
router.delete('/boards/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare("UPDATE boards SET status = 'removed' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// POST make user admin
router.post('/users/:id/role', requireAuth, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ success: true });
});

// GET recent boost orders
router.get('/boosts', requireAuth, requireAdmin, (req, res) => {
  const orders = db.prepare(`
    SELECT bo.*, u.username, b.title as board_title
    FROM boost_orders bo
    JOIN users u ON bo.user_id = u.id
    JOIN boards b ON bo.board_id = b.id
    ORDER BY bo.created_at DESC LIMIT 50
  `).all();
  res.json(orders);
});

export default router;
