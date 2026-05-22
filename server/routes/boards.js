import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import sql from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

const typeImages = {
  Shortboard: 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=600&q=80',
  Longboard:  'https://images.unsplash.com/photo-1545487831-65a8a92a08c3?w=600&q=80',
  Fish:       'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&q=80',
  Gun:        'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80',
  Funboard:   'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80',
  Foil:       'https://images.unsplash.com/photo-1568849676085-51415703900f?w=600&q=80',
  default:    'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=600&q=80',
};

// GET all boards — featured first, then newest
router.get('/', optionalAuth, async (req, res) => {
  const { type, condition, maxPrice, trade, q } = req.query;
  const now = Math.floor(Date.now() / 1000);

  // Build dynamic WHERE conditions using postgres.js fragment composition
  const conds = [sql`b.status = 'active'`];
  if (type && type !== 'All')           conds.push(sql`b.type = ${type}`);
  if (condition && condition !== 'Any') conds.push(sql`b.condition = ${condition}`);
  if (maxPrice)                         conds.push(sql`b.price <= ${Number(maxPrice)}`);
  if (trade === 'true')                 conds.push(sql`b.trade = TRUE`);
  if (q) {
    const like = `%${q}%`;
    conds.push(sql`(b.title ILIKE ${like} OR b.brand ILIKE ${like} OR b.type ILIKE ${like})`);
  }

  // Combine conditions with AND
  const where = conds.reduce((acc, c, i) => i === 0 ? c : sql`${acc} AND ${c}`);

  const boards = await sql`
    SELECT b.*, u.username as seller_name, u.avatar_color as seller_color
    FROM boards b JOIN users u ON b.user_id = u.id
    WHERE ${where}
    ORDER BY (CASE WHEN b.featured = TRUE AND b.featured_until > ${now} THEN 0 ELSE 1 END), b.created_at DESC
  `;

  if (req.user) {
    const saved = await sql`SELECT board_id FROM saved_boards WHERE user_id = ${req.user.id}`;
    const savedSet = new Set(saved.map(r => r.board_id));
    boards.forEach(b => { b.saved = savedSet.has(b.id); });
  } else {
    boards.forEach(b => { b.saved = false; });
  }
  res.json(boards);
});

// GET saved boards for user
router.get('/user/saved', requireAuth, async (req, res) => {
  const boards = await sql`
    SELECT b.*, u.username as seller_name, u.avatar_color as seller_color
    FROM saved_boards sb
    JOIN boards b ON sb.board_id = b.id
    JOIN users u ON b.user_id = u.id
    WHERE sb.user_id = ${req.user.id} AND b.status = 'active'
    ORDER BY sb.created_at DESC
  `;
  boards.forEach(b => { b.saved = true; });
  res.json(boards);
});

// GET my listings
router.get('/user/listings', requireAuth, async (req, res) => {
  const boards = await sql`
    SELECT b.*, u.username as seller_name, u.avatar_color as seller_color
    FROM boards b JOIN users u ON b.user_id = u.id
    WHERE b.user_id = ${req.user.id} ORDER BY b.created_at DESC
  `;
  boards.forEach(b => { b.saved = false; });
  res.json(boards);
});

// GET single board
router.get('/:id', optionalAuth, async (req, res) => {
  const [board] = await sql`
    SELECT b.*, u.username as seller_name, u.avatar_color as seller_color,
      (SELECT COUNT(*) FROM boards WHERE user_id = b.user_id AND status = 'active')::int as seller_listings
    FROM boards b JOIN users u ON b.user_id = u.id WHERE b.id = ${req.params.id}
  `;
  if (!board) return res.status(404).json({ error: 'Board not found' });

  await sql`UPDATE boards SET views = views + 1 WHERE id = ${req.params.id}`;
  board.views += 1;

  if (req.user) {
    const [saved] = await sql`SELECT 1 FROM saved_boards WHERE user_id = ${req.user.id} AND board_id = ${board.id}`;
    board.saved = !!saved;
  }
  res.json(board);
});

// POST create board
router.post('/', requireAuth, async (req, res) => {
  const { title, brand, type, length, width, thickness, volume, fins, condition, price, trade, description, location, images } = req.body;
  if (!title || !type || !condition || !price || !location) return res.status(400).json({ error: 'Missing required fields' });

  const id = uuid();
  const imageList = Array.isArray(images) && images.length > 0 ? images : [];
  const imageUrl  = imageList[0] || typeImages[type] || typeImages.default;
  const finalImages = imageList.length > 0 ? imageList : [imageUrl];

  await sql`
    INSERT INTO boards (id, user_id, title, brand, type, length, width, thickness, volume, fins, condition, price, trade, description, location, image_url, images)
    VALUES (${id}, ${req.user.id}, ${title}, ${brand || ''}, ${type}, ${length || ''}, ${width || ''}, ${thickness || ''}, ${volume || ''}, ${fins || ''}, ${condition}, ${Number(price)}, ${!!trade}, ${description || ''}, ${location}, ${imageUrl}, ${sql.json(finalImages)})
  `;
  const [board] = await sql`SELECT * FROM boards WHERE id = ${id}`;
  res.json(board);
});

// DELETE (mark sold)
router.delete('/:id', requireAuth, async (req, res) => {
  const [board] = await sql`SELECT * FROM boards WHERE id = ${req.params.id}`;
  if (!board)                              return res.status(404).json({ error: 'Not found' });
  if (board.user_id !== req.user.id)       return res.status(403).json({ error: 'Forbidden' });
  await sql`UPDATE boards SET status = 'sold' WHERE id = ${req.params.id}`;
  res.json({ success: true });
});

// POST save/unsave
router.post('/:id/save', requireAuth, async (req, res) => {
  const [existing] = await sql`SELECT 1 FROM saved_boards WHERE user_id = ${req.user.id} AND board_id = ${req.params.id}`;
  if (existing) {
    await sql`DELETE FROM saved_boards WHERE user_id = ${req.user.id} AND board_id = ${req.params.id}`;
    res.json({ saved: false });
  } else {
    await sql`INSERT INTO saved_boards (user_id, board_id) VALUES (${req.user.id}, ${req.params.id}) ON CONFLICT DO NOTHING`;
    res.json({ saved: true });
  }
});

export default router;
