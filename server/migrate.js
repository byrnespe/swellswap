// Run this once to set up the Postgres schema:  node server/migrate.js
import sql from './db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  console.log('▶ Running schema migration...');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await sql.unsafe(schema);
  console.log('✓ Schema is up to date');
  await sql.end();
}

migrate().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
