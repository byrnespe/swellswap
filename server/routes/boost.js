import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import sql from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

export const TIERS = {
  starter: { label: 'Starter', days: 3,  amount: 299, description: '3 days at the top' },
  pro:     { label: 'Pro',     days: 7,  amount: 599, description: '7 days at the top' },
  max:     { label: 'Max',     days: 14, amount: 999, description: '14 days at the top' },
};

router.get('/tiers', (req, res) => res.json(TIERS));

router.post('/boards/:boardId', requireAuth, async (req, res) => {
  const { tier } = req.body;
  const tierData = TIERS[tier];
  if (!tierData) return res.status(400).json({ error: 'Invalid tier' });

  const [board] = await sql`SELECT * FROM boards WHERE id = ${req.params.boardId}`;
  if (!board)                          return res.status(404).json({ error: 'Board not found' });
  if (board.user_id !== req.user.id)   return res.status(403).json({ error: 'Forbidden' });

  const now = Math.floor(Date.now() / 1000);
  const featuredUntil = now + tierData.days * 86400;

  await sql`UPDATE boards SET featured = TRUE, featured_until = ${featuredUntil} WHERE id = ${board.id}`;

  const orderId = uuid();
  await sql`
    INSERT INTO boost_orders (id, user_id, board_id, tier, amount, days)
    VALUES (${orderId}, ${req.user.id}, ${board.id}, ${tier}, ${tierData.amount}, ${tierData.days})
  `;

  res.json({ success: true, featured_until: featuredUntil, order_id: orderId });
});

export default router;
