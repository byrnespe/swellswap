import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import sql from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, password, location } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Username, email and password required' });
  if (password.length < 6)                return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const id = uuid();
    const colors = ['#0ea5e9', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
    const avatar_color = colors[Math.floor(Math.random() * colors.length)];

    await sql`
      INSERT INTO users (id, username, email, password_hash, location, avatar_color)
      VALUES (${id}, ${username.trim()}, ${email.toLowerCase().trim()}, ${hash}, ${location || ''}, ${avatar_color})
    `;
    const [user] = await sql`SELECT id, username, email, location, avatar_color, role FROM users WHERE id = ${id}`;
    const token = jwt.sign({ id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('username') ? 'Username' : 'Email';
      return res.status(400).json({ error: `${field} already taken` });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const [user] = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}`;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { id } = jwt.verify(header.slice(7), JWT_SECRET);
    const [user] = await sql`SELECT id, username, email, location, avatar_color, role FROM users WHERE id = ${id}`;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
