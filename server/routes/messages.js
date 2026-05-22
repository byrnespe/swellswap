import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import sql from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET all conversations for current user
router.get('/conversations', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const convos = await sql`
    SELECT c.*,
      b.title as board_title, b.price as board_price, b.image_url as board_image,
      buyer.username  as buyer_name,  buyer.avatar_color  as buyer_color,
      seller.username as seller_name, seller.avatar_color as seller_color,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read = FALSE AND sender_id <> ${uid})::int as unread_count
    FROM conversations c
    JOIN boards b ON c.board_id = b.id
    JOIN users buyer  ON c.buyer_id  = buyer.id
    JOIN users seller ON c.seller_id = seller.id
    WHERE c.buyer_id = ${uid} OR c.seller_id = ${uid}
    ORDER BY last_message_at DESC NULLS LAST
  `;
  res.json(convos);
});

// GET or create conversation for a board
router.post('/conversations', requireAuth, async (req, res) => {
  const { board_id } = req.body;
  if (!board_id) return res.status(400).json({ error: 'board_id required' });

  const [board] = await sql`SELECT * FROM boards WHERE id = ${board_id}`;
  if (!board)                          return res.status(404).json({ error: 'Board not found' });
  if (board.user_id === req.user.id)   return res.status(400).json({ error: 'Cannot message yourself' });

  let [convo] = await sql`SELECT * FROM conversations WHERE buyer_id = ${req.user.id} AND board_id = ${board_id}`;
  if (!convo) {
    const id = uuid();
    await sql`INSERT INTO conversations (id, buyer_id, seller_id, board_id) VALUES (${id}, ${req.user.id}, ${board.user_id}, ${board_id})`;
    [convo] = await sql`SELECT * FROM conversations WHERE id = ${id}`;
  }
  res.json(convo);
});

// GET messages in a conversation
router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  const [convo] = await sql`SELECT * FROM conversations WHERE id = ${req.params.id}`;
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (convo.buyer_id !== req.user.id && convo.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await sql`UPDATE messages SET read = TRUE WHERE conversation_id = ${req.params.id} AND sender_id <> ${req.user.id}`;

  const messages = await sql`
    SELECT m.*, u.username as sender_name, u.avatar_color as sender_color
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ${req.params.id}
    ORDER BY m.created_at ASC
  `;
  res.json(messages);
});

// POST send a message
router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

  const [convo] = await sql`SELECT * FROM conversations WHERE id = ${req.params.id}`;
  if (!convo) return res.status(404).json({ error: 'Not found' });
  if (convo.buyer_id !== req.user.id && convo.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const id = uuid();
  await sql`INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (${id}, ${req.params.id}, ${req.user.id}, ${content.trim()})`;
  const [message] = await sql`
    SELECT m.*, u.username as sender_name, u.avatar_color as sender_color
    FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ${id}
  `;
  res.json(message);
});

// GET unread count
router.get('/unread', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const [result] = await sql`
    SELECT COUNT(*)::int as count FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE (c.buyer_id = ${uid} OR c.seller_id = ${uid})
      AND m.sender_id <> ${uid} AND m.read = FALSE
  `;
  res.json({ count: result.count });
});

export default router;
