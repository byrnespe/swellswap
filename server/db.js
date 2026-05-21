import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'swellswap.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    location TEXT DEFAULT '',
    avatar_color TEXT DEFAULT '#0ea5e9',
    role TEXT DEFAULT 'user',
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    brand TEXT DEFAULT '',
    type TEXT NOT NULL,
    length TEXT DEFAULT '',
    width TEXT DEFAULT '',
    thickness TEXT DEFAULT '',
    volume TEXT DEFAULT '',
    fins TEXT DEFAULT '',
    condition TEXT NOT NULL,
    price INTEGER NOT NULL,
    trade INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    location TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    featured INTEGER DEFAULT 0,
    featured_until INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS boost_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    board_id TEXT NOT NULL REFERENCES boards(id),
    tier TEXT NOT NULL,
    amount INTEGER NOT NULL,
    days INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL REFERENCES users(id),
    seller_id TEXT NOT NULL REFERENCES users(id),
    board_id TEXT NOT NULL REFERENCES boards(id),
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(buyer_id, seller_id, board_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    sender_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    read INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_id, endpoint)
  );

  CREATE TABLE IF NOT EXISTS saved_boards (
    user_id TEXT NOT NULL REFERENCES users(id),
    board_id TEXT NOT NULL REFERENCES boards(id),
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY(user_id, board_id)
  );
`);

export default db;
