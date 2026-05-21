import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../server/swellswap.db'));

// Add missing columns
const userCols  = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
const boardCols = db.prepare('PRAGMA table_info(boards)').all().map(c => c.name);

if (!userCols.includes('role')) {
  db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run();
  console.log('✓ Added users.role');
}
if (!boardCols.includes('featured')) {
  db.prepare('ALTER TABLE boards ADD COLUMN featured INTEGER DEFAULT 0').run();
  console.log('✓ Added boards.featured');
}
if (!boardCols.includes('featured_until')) {
  db.prepare('ALTER TABLE boards ADD COLUMN featured_until INTEGER DEFAULT 0').run();
  console.log('✓ Added boards.featured_until');
}
if (!boardCols.includes('images')) {
  db.prepare("ALTER TABLE boards ADD COLUMN images TEXT DEFAULT '[]'").run();
  console.log('✓ Added boards.images');
}

db.exec(`CREATE TABLE IF NOT EXISTS boost_orders (
  id TEXT PRIMARY KEY, user_id TEXT, board_id TEXT,
  tier TEXT NOT NULL, amount INTEGER NOT NULL, days INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
)`);
console.log('✓ boost_orders table ready');

// List users
const users = db.prepare('SELECT id, username, email, role FROM users').all();
console.log('\nUsers in database:');
users.forEach((u, i) => console.log(`  [${i}] ${u.username} <${u.email}> — ${u.role}`));

// Promote the first user (or all users if only one)
if (users.length === 0) {
  console.log('\nNo users yet — sign up first, then run this script again.');
} else {
  // Promote user named 'peter' or the first user
  const target = users.find(u => u.username.toLowerCase() === 'peter') || users[0];
  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(target.id);
  console.log(`\n✓ Promoted "${target.username}" to admin`);
}
