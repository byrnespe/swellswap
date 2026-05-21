import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

const typeImages = {
  Shortboard: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=500&q=80',
  Longboard:  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
  Fish:       'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=500&q=80',
  Gun:        'https://images.unsplash.com/photo-1531722569936-825d4eaf4b9d?w=500&q=80',
  Funboard:   'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&q=80',
  default:    'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=500&q=80',
};

function parseBoard(b) {
  b.trade    = b.trade === 1;
  b.featured = b.featured === 1;
  try { b.images = JSON.parse(b.images || '[]'); } catch { b.images = []; }
  if (!b.image_url && b.images.length > 0) b.image_url = b.images[0];
  return b;
}

// GET all boards — featured first, then newest
router.get('/', optionalAuth, (req, res) => {
  const { type, condition, maxPrice, trade, q } = req.query;
  const now = Math.floor(Date.now() / 1000);
  let sql = `
    SELECT b.*, u.username as seller_name, u.avatar_color as seller_color
    FROM boards b JOIN users u ON b.user_id = u.id
    WHERE b.status = 'active'
  `;
  const params = [];
  if (type && type !== 'All')       { sql += ' AND b.type = ?'; params.push(type); }
  if (condition && condition !== 'Any') { sql += ' AND b.condition = ?'; params.push(condition); }
  if (maxPrice)                     { sql += ' AND b.price <= ?'; params.push(Number(maxPrice)); }
  if (trade === 'true')             { sql += ' AND b.trade = 1'; }
  if (q) { sql += ' AND (b.title LIKE ? OR b.brand LIKE ? OR b.type LIKE ?)'; const l = `%${q}%`; params.push(l, l, l); }
  // Featured (non-expired) first, then newest
  sql += ` ORDER BY CASE WHEN b.featured = 1 AND b.featured_until > ${now} THEN 0 ELSE 1 END, b.created_at DESC`;

  const boards = db.prepare(sql).all(...params).map(parseBoard);

  if (req.user) {
    const saved = db.prepare('SELECT board_id FROM saved_boards WHERE user_id = ?').all(req.user.id).map(r => r.board_id);
    boards.forEach(b => { b.saved = saved.includes(b.id); });
  } else {
    boards.forEach(b => { b.saved = false; });
  }
  res.json(boards);
});

// GET single board
router.get('/:id', optionalAuth, (req, res) => {
  if (req.params.id === 'user') return res.status(400).json({ error: 'Invalid' });
  const board = db.prepare(`
    SELECT b.*, u.username as seller_name, u.avatar_color as seller_color,
    (SELECT COUNT(*) FROM boards WHERE user_id = b.user_id AND status = 'active') as seller_listings
    FROM boards b JOIN users u ON b.user_id = u.id WHERE b.id = ?
  `).get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  db.prepare('UPDATE boards SET views = views + 1 WHERE id = ?').run(req.params.id);
  board.views += 1;
  parseBoard(board);
  if (req.user) {
    board.saved = !!db.prepare('SELECT 1 FROM saved_boards WHERE user_id = ? AND board_id = ?').get(req.user.id, board.id);
  }
  res.json(board);
});

// POST create board
router.post('/', requireAuth, (req, res) => {
  const { title, brand, type, length, width, thickness, volume, fins, condition, price, trade, description, location, images } = req.body;
  if (!title || !type || !condition || !price || !location) return res.status(400).json({ error: 'Missing required fields' });

  const id = uuid();
  const imageList = Array.isArray(images) && images.length > 0 ? images : [];
  const imageUrl  = imageList[0] || typeImages[type] || typeImages.default;
  const imagesJson = JSON.stringify(imageList.length > 0 ? imageList : [imageUrl]);

  db.prepare(`
    INSERT INTO boards (id, user_id, title, brand, type, length, width, thickness, volume, fins, condition, price, trade, description, location, image_url, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, title, brand||'', type, length||'', width||'', thickness||'', volume||'', fins||'', condition, Number(price), trade?1:0, description||'', location, imageUrl, imagesJson);

  res.json(parseBoard(db.prepare('SELECT * FROM boards WHERE id = ?').get(id)));
});

// DELETE (mark sold)
router.delete('/:id', requireAuth, (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Not found' });
  if (board.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare("UPDATE boards SET status = 'sold' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// POST save/unsave
router.post('/:id/save', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM saved_boards WHERE user_id = ? AND board_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM saved_boards WHERE user_id = ? AND board_id = ?').run(req.user.id, req.params.id);
    res.json({ saved: false });
  } else {
    db.prepare('INSERT OR IGNORE INTO saved_boards (user_id, board_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    res.json({ saved: true });
  }
});

// GET saved boards
router.get('/user/saved', requireAuth, (req, res) => {
  const boards = db.prepare(`
    SELECT b.*, u.username as seller_name, u.avatar_color as seller_color
    FROM saved_boards sb JOIN boards b ON sb.board_id = b.id JOIN users u ON b.user_id = u.id
    WHERE sb.user_id = ? AND b.status = 'active' ORDER BY sb.created_at DESC
  `).all(req.user.id).map(b => { parseBoard(b); b.saved = true; return b; });
  res.json(boards);
});

// GET my listings
router.get('/user/listings', requireAuth, (req, res) => {
  const boards = db.prepare(`
    SELECT b.*, u.username as seller_name, u.avatar_color as seller_color
    FROM boards b JOIN users u ON b.user_id = u.id WHERE b.user_id = ? ORDER BY b.created_at DESC
  `).all(req.user.id).map(b => { parseBoard(b); b.saved = false; return b; });
  res.json(boards);
});

export default router;
