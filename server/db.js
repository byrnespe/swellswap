import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('💥 DATABASE_URL is not set. Add it to your .env file or Railway environment variables.');
  process.exit(1);
}

// Parse manually so special chars in passwords (!, @, #, etc.) don't trip up
// any URL parser. The URL spec says these are safe inside userinfo, but
// different libraries handle them inconsistently — explicit > magical.
const url = new URL(connectionString);
const config = {
  host:     url.hostname,
  port:     parseInt(url.port, 10) || 5432,
  database: url.pathname.slice(1) || 'postgres',
  username: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  ssl:             'require',
  max:             10,
  idle_timeout:    20,
  connect_timeout: 10,
  prepare:         false, // Required for Supabase pgbouncer compatibility
};

console.log(`▶ DB target: ${config.host}:${config.port}/${config.database} as ${config.username}`);

const sql = postgres(config);

export default sql;
