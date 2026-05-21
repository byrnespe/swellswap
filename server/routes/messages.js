import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET all conversations for current user
router.get('/conversations', requireAuth, (req, res) => {
  const convos = db.prepare(`
    SELECT c.*,
      b.title as board_title, b.price as board_price, b.image_url as board_image,
      buyer.username as buyer_name, buyer.avatar_color as buyer_color,
      seller.username as seller_name, seller.avatar_color as seller_color,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read = 0 AND sender_id != ?) as unread_count
    FROM conversations c
    JOIN boards b ON c.board_id = b.id
    JOIN users buyer ON c.buyer_id = buyer.id
    JOIN users seller ON c.seller_id = seller.id
    WHERE c.buyer_id = ? OR c.seller_id = ?
    ORDER BY last_message_at DESC NULLS LAST
  `).all(req.user.id, req.user.id, req.user.id);

  res.json(convos);
});

// GET or create conversation for a board
router.post('/conversations', requireAuth, (req, res) => {
  const { board_id } = req.body;
  if (!board_id) return res.status(400).json({ error: 'board_id required' });

  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(board_id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  if (board.user_id === req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });

  let convo = db.prepare('SELECT * FROM conversations WHERE buyer_id = ? AND board_id = ?').get(req.user.id, board_id);
  if (!convo) {
    const id = uuid();
    db.prepare('INSERT INTO conversations (id, buyer_id, seller_id, board_id) VALUES (?, ?, ?, ?)').run(id, req.user.id, board.user_id, board_id);
    convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  }
  res.json(convo);
});

// GET messages in a conversation
router.get('/conversations/:id/messages', requireAuth, (req, res) => {
  const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (convo.buyer_id !== req.user.id && convo.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Mark messages as read
  db.prepare('UPDATE messages SET read = 1 WHERE conversation_id = ? AND sender_id != ?').run(req.params.id, req.user.id);

  const messages = db.prepare(`
    SELECT m.*, u.username as sender_name, u.avatar_color as sender_color
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `).all(req.params.id);

  res.json(messages);
});

// POST send a message (REST fallback, Socket.io is primary)
router.post('/conversations/:id/messages', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

  const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Not found' });
  if (convo.buyer_id !== req.user.id && convo.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const id = uuid();
  db.prepare('INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)').run(id, req.params.id, req.user.id, content.trim());

  const message = db.prepare(`
    SELECT m.*, u.username as sender_name, u.avatar_color as sender_color
    FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?
  `).get(id);

  res.json(message);
});

// GET unread count
router.get('/unread', requireAuth, (req, res) => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE (c.buyer_id = ? OR c.seller_id = ?) AND m.sender_id != ? AND m.read = 0
  `).get(req.user.id, req.user.id, req.user.id);
  res.json({ count: result.count });
});

export default router;
