// Auto-seed the database with demo data on first startup
// Only runs if the boards table is empty
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from './db.js';

export function seedIfEmpty() {
  const boardCount = db.prepare('SELECT COUNT(*) as n FROM boards').get().n;
  if (boardCount > 0) {
    console.log(`Database has ${boardCount} boards — skipping seed`);
    return;
  }

  console.log('Empty database detected — seeding demo data...');

  // Ensure schema is up to date (idempotent migrations)
  const userCols  = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  const boardCols = db.prepare('PRAGMA table_info(boards)').all().map(c => c.name);
  if (!userCols.includes('role'))           db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run();
  if (!boardCols.includes('featured'))      db.prepare('ALTER TABLE boards ADD COLUMN featured INTEGER DEFAULT 0').run();
  if (!boardCols.includes('featured_until'))db.prepare('ALTER TABLE boards ADD COLUMN featured_until INTEGER DEFAULT 0').run();
  if (!boardCols.includes('images'))        db.prepare("ALTER TABLE boards ADD COLUMN images TEXT DEFAULT '[]'").run();
  db.exec(`CREATE TABLE IF NOT EXISTS boost_orders (
    id TEXT PRIMARY KEY, user_id TEXT, board_id TEXT,
    tier TEXT NOT NULL, amount INTEGER NOT NULL, days INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  const users = [
    { username: 'mikesurfs',   email: 'mike@demo.com',   location: 'Belmar, NJ',         color: '#0ea5e9' },
    { username: 'tylerwave',   email: 'tyler@demo.com',  location: 'Manasquan, NJ',      color: '#8b5cf6' },
    { username: 'dana_k',      email: 'dana@demo.com',   location: 'Asbury Park, NJ',    color: '#ec4899' },
    { username: 'jessmsurf',   email: 'jess@demo.com',   location: 'Point Pleasant, NJ', color: '#10b981' },
    { username: 'chrisb_nj',   email: 'chris@demo.com',  location: 'Spring Lake, NJ',    color: '#f97316' },
    { username: 'sandyshores', email: 'sandy@demo.com',  location: 'Long Branch, NJ',    color: '#facc15' },
  ];

  const hash = bcrypt.hashSync('demo1234', 10);
  const userIds = {};

  for (const u of users) {
    const id = uuid();
    db.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash, location, avatar_color)
                VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, u.username, u.email, hash, u.location, u.color);
    const stored = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    userIds[u.username] = stored.id;
  }

  const boards = [
    { seller: 'mikesurfs', title: "Lost Puddle Jumper 5'10", brand: 'Lost', type: 'Shortboard', length: "5'10\"", width: '19.5"', thickness: '2.5"', volume: '30.5L', fins: 'Thruster', condition: 'Good', price: 425, trade: true, location: 'Belmar, NJ', image_url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&q=80', description: "Rode this board for one season. Some heel dents near the tail but no cracks or dings. Great all-around board for beach break. Works well from 2–6ft. Includes FCS2 fins. Cash only, meet at Belmar beach.", featured: 1 },
    { seller: 'tylerwave', title: "Channel Islands Fever Dream 6'0", brand: 'Channel Islands', type: 'Shortboard', length: "6'0\"", width: '18.75"', thickness: '2.38"', volume: '28L', fins: 'Thruster', condition: 'Excellent', price: 675, trade: false, location: 'Manasquan, NJ', image_url: 'https://images.unsplash.com/photo-1531722569936-825d4eaf4b9d?w=600&q=80', description: "Barely used. Bought new last spring, only surfed maybe 15 times total. Zero dings, no pressure dents. Comes with Future fins and a board bag. This thing rips in punchy NJ surf." },
    { seller: 'dana_k', title: "Firewire Seaside 5'5", brand: 'Firewire', type: 'Fish', length: "5'5\"", width: '21"', thickness: '2.63"', volume: '34L', fins: 'Twin', condition: 'Fair', price: 280, trade: true, location: 'Asbury Park, NJ', image_url: 'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=600&q=80', description: "Great small wave board. Has a few pressure dings and one repaired ding on the nose but completely waterproof. Surfs amazing on waist-high days. Looking to trade for a longboard or longer fish." },
    { seller: 'jessmsurf', title: "Catch Surf Odysea Log 8'0", brand: 'Catch Surf', type: 'Longboard', length: "8'0\"", width: '22.5"', thickness: '3"', volume: '68L', fins: 'Single+2', condition: 'Good', price: 320, trade: true, location: 'Point Pleasant, NJ', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', description: "Super fun soft-top longboard. Perfect for small days or learning. Two seasons old with normal wear. Great for mellow NJ summer surf. Will trade for a shortboard around 6ft." },
    { seller: 'chrisb_nj', title: "JS Industries Monsta Box 5'8", brand: 'JS Industries', type: 'Shortboard', length: "5'8\"", width: '20.5"', thickness: '2.56"', volume: '32L', fins: 'Quad', condition: 'Excellent', price: 580, trade: false, location: 'Spring Lake, NJ', image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80', description: "Only surfed a handful of times. Stepped up to a higher performance board so selling this. Comes with FCS2 quad fins. No damage at all. Serious buyers only." },
    { seller: 'sandyshores', title: "Haydenshapes Hypto Krypto 5'11", brand: 'Haydenshapes', type: 'Shortboard', length: "5'11\"", width: '20.25"', thickness: '2.5"', volume: '31.5L', fins: 'Thruster', condition: 'Good', price: 510, trade: true, location: 'Long Branch, NJ', image_url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&q=80', description: "Classic HK shape. Super versatile, great in everything from waist-high mush to overhead. Some minor heel dents but surfs like new. Fins included. Open to trades for a fish or longboard." },
    { seller: 'mikesurfs', title: "Rusty Dwart 5'6", brand: 'Rusty', type: 'Fish', length: "5'6\"", width: '20.75"', thickness: '2.5"', volume: '33L', fins: 'Twin', condition: 'Good', price: 350, trade: false, location: 'Belmar, NJ', image_url: 'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=600&q=80', description: "Sick little twin fin fish. Absolutely rips in weak NJ surf. Got it a year ago, surfed it maybe 20 times. A few minor pressure dings on deck but nothing structural." },
    { seller: 'tylerwave', title: "Album Surf Twinsman 5'8", brand: 'Album Surf', type: 'Fish', length: "5'8\"", width: '21.25"', thickness: '2.63"', volume: '36L', fins: 'Twin', condition: 'Excellent', price: 620, trade: false, location: 'Manasquan, NJ', image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80', description: "Brand new condition. Only rode 5 times. This thing is fast and fun. Way too floaty for me now. Comes with Futures twin fins and sock." },
    { seller: 'dana_k', title: "Torq Longboard 9'0", brand: 'Torq', type: 'Longboard', length: "9'0\"", width: '22.75"', thickness: '2.75"', volume: '75L', fins: 'Single+2', condition: 'Good', price: 400, trade: true, location: 'Asbury Park, NJ', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', description: "Solid epoxy longboard, super durable. Perfect for cruising small NJ summer swells. A few minor dings all repaired. Includes fin." },
    { seller: 'jessmsurf', title: "Channel Islands Happy Everyday 6'2", brand: 'Channel Islands', type: 'Funboard', length: "6'2\"", width: '20.5"', thickness: '2.63"', volume: '38L', fins: 'Thruster', condition: 'Good', price: 490, trade: true, location: 'Point Pleasant, NJ', image_url: 'https://images.unsplash.com/photo-1531722569936-825d4eaf4b9d?w=600&q=80', description: "Great transition board moving from longboard to shortboard. Tons of paddle power but still responsive." },
    { seller: 'chrisb_nj', title: "Lost RNF 5'7", brand: 'Lost', type: 'Fish', length: "5'7\"", width: '20.88"', thickness: '2.5"', volume: '33.7L', fins: 'Quad', condition: 'Fair', price: 295, trade: true, location: 'Spring Lake, NJ', image_url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&q=80', description: "Classic retro fish shape. Has some wear and a couple repaired dings but rides great. Perfect small wave ripper." },
    { seller: 'sandyshores', title: "Softech XEON FCS II 6'", brand: 'Softech', type: 'Funboard', length: "6'0\"", width: '21.5"', thickness: '3"', volume: '42L', fins: 'Thruster', condition: 'Excellent', price: 220, trade: false, location: 'Long Branch, NJ', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', description: "Soft-top in near-perfect condition. Great for learning or small summer days." },
    { seller: 'mikesurfs', title: "DHD Sweet Spot 6'1", brand: 'DHD', type: 'Shortboard', length: "6'1\"", width: '19"', thickness: '2.44"', volume: '29L', fins: 'Thruster', condition: 'Good', price: 540, trade: false, location: 'Belmar, NJ', image_url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&q=80', description: "Rides great in punchy NJ beachbreak. Some heel dents but no dings. FCS2 fins included." },
    { seller: 'tylerwave', title: "Lib Tech Pickup Stick 6'0", brand: 'Lib Tech', type: 'Shortboard', length: "6'0\"", width: '20"', thickness: '2.5"', volume: '33L', fins: 'Thruster', condition: 'Excellent', price: 590, trade: true, location: 'Manasquan, NJ', image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80', description: "Eco-friendly construction, super durable. Great all-rounder. Barely used. Open to trades." },
    { seller: 'dana_k', title: "Mick Fanning Softboard 7'", brand: 'Mick Fanning', type: 'Longboard', length: "7'0\"", width: '21"', thickness: '2.88"', volume: '52L', fins: 'Thruster', condition: 'Good', price: 260, trade: false, location: 'Asbury Park, NJ', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', description: "Super fun mid-length soft top. Great for all skill levels." },
    { seller: 'jessmsurf', title: "Pyzel Ghost 6'2", brand: 'Pyzel', type: 'Shortboard', length: "6'2\"", width: '19.38"', thickness: '2.5"', volume: '31L', fins: 'Thruster', condition: 'Good', price: 600, trade: false, location: 'Point Pleasant, NJ', image_url: 'https://images.unsplash.com/photo-1531722569936-825d4eaf4b9d?w=600&q=80', description: "Jon Pyzel shapes are some of the best in the game. Solid condition with some pressure dings. Futures fins included." },
    { seller: 'chrisb_nj', title: "Creatures Step Up 6'6", brand: 'Creatures', type: 'Gun', length: "6'6\"", width: '18.5"', thickness: '2.38"', volume: '27L', fins: 'Thruster', condition: 'Excellent', price: 450, trade: true, location: 'Spring Lake, NJ', image_url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&q=80', description: "Built for solid surf. Barely used. Perfect for overhead-plus days." },
    { seller: 'sandyshores', title: "Madeira Custom Log 9'6", brand: 'Madeira', type: 'Longboard', length: "9'6\"", width: '23"', thickness: '3"', volume: '82L', fins: 'Single', condition: 'Fair', price: 380, trade: true, location: 'Long Branch, NJ', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', description: "Old school single fin log. Has character — some dings repaired over the years. This thing catches every wave." },
    { seller: 'mikesurfs', title: "Firewire Dominator 6'4", brand: 'Firewire', type: 'Funboard', length: "6'4\"", width: '21.25"', thickness: '2.75"', volume: '44L', fins: 'Thruster', condition: 'Good', price: 460, trade: false, location: 'Belmar, NJ', image_url: 'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=600&q=80', description: "Timbertek construction so it's super durable and light. Great mid-length for NJ surf. Includes Future fins." },
    { seller: 'tylerwave', title: "Rusty Slayer HP 5'11", brand: 'Rusty', type: 'Shortboard', length: "5'11\"", width: '19.13"', thickness: '2.44"', volume: '29.5L', fins: 'Thruster', condition: 'Fair', price: 310, trade: true, location: 'Manasquan, NJ', image_url: 'https://images.unsplash.com/photo-1531722569936-825d4eaf4b9d?w=600&q=80', description: "Rode this thing hard for two seasons. Battle scars but no delams. Still surfs great. Perfect beater board." },
  ];

  const now = Math.floor(Date.now() / 1000);
  let count = 0;

  for (const b of boards) {
    const sellerId = userIds[b.seller];
    if (!sellerId) continue;
    const id = uuid();
    const createdAt = now - Math.floor(Math.random() * 7 * 86400);
    const featuredUntil = b.featured ? now + 7 * 86400 : 0;
    db.prepare(`INSERT INTO boards
      (id, user_id, title, brand, type, length, width, thickness, volume, fins,
       condition, price, trade, description, location, image_url, images,
       featured, featured_until, views, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sellerId, b.title, b.brand, b.type,
      b.length, b.width, b.thickness, b.volume, b.fins,
      b.condition, b.price, b.trade ? 1 : 0,
      b.description, b.location, b.image_url,
      JSON.stringify([b.image_url]),
      b.featured ? 1 : 0, featuredUntil,
      Math.floor(Math.random() * 120) + 5,
      createdAt,
    );
    count++;
  }
  console.log(`✓ Seeded ${count} boards & ${users.length} demo users (login: any of *@demo.com / demo1234)`);
}
