import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('💥 DATABASE_URL is not set. Add it to your .env file or Railway environment variables.');
  console.error('   Example: DATABASE_URL=postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres');
  process.exit(1);
}

// postgres.js handles connection pooling, parameterized queries, and async natively
const sql = postgres(connectionString, {
  ssl: 'require',     // Supabase requires SSL
  max: 10,            // connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,     // Required for Supabase pgbouncer compatibility
});

export default sql;
