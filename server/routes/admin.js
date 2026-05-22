import { Router } from 'express';
import sql from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function requireAdmin(req, res, next) {
  const [user] = await sql`SELECT role FROM users WHERE id = ${req.user.id}`;
  if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  const [{ n: totalUsers }]     = await sql`SELECT COUNT(*)::int as n FROM users`;
  const [{ n: totalBoards }]    = await sql`SELECT COUNT(*)::int as n FROM boards`;
  const [{ n: activeBoards }]   = await sql`SELECT COUNT(*)::int as n FROM boards WHERE status = 'active'`;
  const [{ n: totalMessages }]  = await sql`SELECT COUNT(*)::int as n FROM messages`;
  const [{ n: totalBoosts }]    = await sql`SELECT COUNT(*)::int as n FROM boost_orders`;
  const [{ total: revenue }]    = await sql`SELECT COALESCE(SUM(amount),0)::int as total FROM boost_orders`;

  const dayAgo = Math.floor(Date.now() / 1000) - 86400;
  const [{ n: newUsersToday }]  = await sql`SELECT COUNT(*)::int as n FROM users  WHERE created_at > ${dayAgo}`;
  const [{ n: newBoardsToday }] = await sql`SELECT COUNT(*)::int as n FROM boards WHERE created_at > ${dayAgo}`;

  res.json({ totalUsers, totalBoards, activeBoards, totalMessages, totalBoosts, revenue, newUsersToday, newBoardsToday });
});

router.get('/boards', requireAuth, requireAdmin, async (req, res) => {
  const boards = await sql`
    SELECT b.*, u.username as seller_name, u.email as seller_email
    FROM boards b JOIN users u ON b.user_id = u.id
    ORDER BY b.created_at DESC LIMIT 100
  `;
  res.json(boards);
});

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await sql`
    SELECT u.id, u.username, u.email, u.location, u.role, u.created_at, u.avatar_color,
      (SELECT COUNT(*) FROM boards   WHERE user_id   = u.id)::int as board_count,
      (SELECT COUNT(*) FROM messages WHERE sender_id = u.id)::int as message_count
    FROM users u ORDER BY u.created_at DESC
  `;
  res.json(users);
});

router.delete('/boards/:id', requireAuth, requireAdmin, async (req, res) => {
  await sql`UPDATE boards SET status = 'removed' WHERE id = ${req.params.id}`;
  res.json({ success: true });
});

router.post('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  await sql`UPDATE users SET role = ${role} WHERE id = ${req.params.id}`;
  res.json({ success: true });
});

router.get('/boosts', requireAuth, requireAdmin, async (req, res) => {
  const orders = await sql`
    SELECT bo.*, u.username, b.title as board_title
    FROM boost_orders bo
    JOIN users u ON bo.user_id = u.id
    JOIN boards b ON bo.board_id = b.id
    ORDER BY bo.created_at DESC LIMIT 50
  `;
  res.json(orders);
});

export default router;
