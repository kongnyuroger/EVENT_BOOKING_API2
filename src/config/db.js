require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:                   process.env.DB_HOST,
  port:                   Number(process.env.DB_PORT) || 5432,
  database:               process.env.DB_NAME,
  user:                   process.env.DB_USER,
  password:               process.env.DB_PASSWORD,
  max:                    10,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false } 
});

pool.on('error', (err) => {
  console.error('Unexpected pg client error', err);
  process.exit(1);
});

module.exports = pool;
