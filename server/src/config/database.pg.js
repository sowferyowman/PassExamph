const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to use the PostgreSQL database connection.");
}

const requiresSsl = process.env.PG_SSL === "true"
  || process.env.NODE_ENV === "production"
  || /[?&]sslmode=(require|verify-ca|verify-full)/i.test(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined
});

module.exports = { pool };
