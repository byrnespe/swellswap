import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Boost tiers
export const TIERS = {
  starter: { label: 'Starter', days: 3, amount: 299, description: '3 days at the top' },
  pro:     { label: 'Pro',     days: 7, amount: 599, description: '7 days at the top' },
  max:     { label: 'Max',     days: 14, amount: 999, description: '14 days at the top' },
};

// GET boost options
router.get('/tiers', (req, res) => res.json(TIERS));

// POST boost a listing (mock payment — no real card processing)
router.post('/boards/:boardId', requireAuth, (req, res) => {
  const { tier } = req.body;
  const tierData = TIERS[tier];
  if (!tierData) return res.status(400).json({ error: 'Invalid tier' });

  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  if (board.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const now = Math.floor(Date.now() / 1000);
  const featuredUntil = now + tierData.days * 86400;

  db.prepare('UPDATE boards SET featured = 1, featured_until = ? WHERE id = ?').run(featuredUntil, board.id);

  const orderId = uuid();
  db.prepare('INSERT INTO boost_orders (id, user_id, board_id, tier, amount, days) VALUES (?, ?, ?, ?, ?, ?)')
    .run(orderId, req.user.id, board.id, tier, tierData.amount, tierData.days);

  res.json({ success: true, featured_until: featuredUntil, order_id: orderId });
});

export default router;
