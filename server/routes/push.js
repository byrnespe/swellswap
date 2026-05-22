import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import webpush from 'web-push';
import sql from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/subscribe', requireAuth, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Invalid subscription' });
  const id = uuid();
  await sql`
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
    VALUES (${id}, ${req.user.id}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
    ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `;
  res.json({ success: true });
});

router.post('/unsubscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body;
  await sql`DELETE FROM push_subscriptions WHERE user_id = ${req.user.id} AND endpoint = ${endpoint}`;
  res.json({ success: true });
});

export async function sendPushToUser(userId, payload) {
  const subs = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId}`;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`;
      }
    }
  }
}

export default router;
