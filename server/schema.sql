-- SwellSwap Postgres Schema (Supabase)
-- Idempotent: safe to run multiple times

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  location        TEXT DEFAULT '',
  avatar_color    TEXT DEFAULT '#0ea5e9',
  role            TEXT DEFAULT 'user',
  created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS boards (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  brand           TEXT DEFAULT '',
  type            TEXT NOT NULL,
  length          TEXT DEFAULT '',
  width           TEXT DEFAULT '',
  thickness       TEXT DEFAULT '',
  volume          TEXT DEFAULT '',
  fins            TEXT DEFAULT '',
  condition       TEXT NOT NULL,
  price           INTEGER NOT NULL,
  trade           BOOLEAN DEFAULT FALSE,
  description     TEXT DEFAULT '',
  location        TEXT NOT NULL,
  image_url       TEXT DEFAULT '',
  images          JSONB DEFAULT '[]'::jsonb,
  status          TEXT DEFAULT 'active',
  featured        BOOLEAN DEFAULT FALSE,
  featured_until  BIGINT DEFAULT 0,
  views           INTEGER DEFAULT 0,
  created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);
CREATE INDEX IF NOT EXISTS idx_boards_status     ON boards(status);
CREATE INDEX IF NOT EXISTS idx_boards_user_id    ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_type       ON boards(type);
CREATE INDEX IF NOT EXISTS idx_boards_featured   ON boards(featured, featured_until);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at DESC);

CREATE TABLE IF NOT EXISTS boost_orders (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id        TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  tier            TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  days            INTEGER NOT NULL,
  created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  buyer_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id        TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  UNIQUE (buyer_id, seller_id, board_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer  ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  read            BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS saved_boards (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id        TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  PRIMARY KEY (user_id, board_id)
);
