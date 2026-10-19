const mysql = require('mysql2/promise');
require('dotenv').config();

let poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'reservation_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
};

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    poolConfig.host = url.hostname || poolConfig.host;
    poolConfig.port = Number(url.port) || poolConfig.port;
    poolConfig.user = url.username ? decodeURIComponent(url.username) : poolConfig.user;
    poolConfig.password = url.password ? decodeURIComponent(url.password) : poolConfig.password;
    if (url.pathname && url.pathname.length > 1) {
      poolConfig.database = url.pathname.slice(1);
    }
  } catch (e) {
    // URL parse fallback
  }
}

const pool = mysql.createPool(poolConfig);

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row };
  if (copy.booking_date instanceof Date) {
    copy.booking_date = copy.booking_date.toISOString().substring(0, 10);
  } else if (typeof copy.booking_date === 'string' && copy.booking_date.includes('T')) {
    copy.booking_date = copy.booking_date.substring(0, 10);
  }
  if (typeof copy.booking_time === 'string' && copy.booking_time.length > 5) {
    copy.booking_time = copy.booking_time.substring(0, 5);
  }
  return copy;
}

async function query(text, params = []) {
  let sql = text;

  // 1. Convert PostgreSQL to_char to MySQL DATE_FORMAT
  sql = sql.replace(/to_char\s*\(\s*([^,]+?)\s*,\s*'YYYY-MM-DD'\s*\)/gi, "DATE_FORMAT($1, '%Y-%m-%d')");
  sql = sql.replace(/to_char\s*\(\s*([^,]+?)\s*,\s*'HH24:MI'\s*\)/gi, "DATE_FORMAT($1, '%H:%i')");

  // 2. Convert ILIKE to LIKE
  sql = sql.replace(/\bILIKE\b/gi, 'LIKE');

  // 3. Detect RETURNING clause
  const hasReturningStar = /RETURNING\s+\*/i.test(sql);
  const hasReturningId = /RETURNING\s+id/i.test(sql);
  if (hasReturningStar || hasReturningId) {
    sql = sql.replace(/\s*RETURNING\s+(\*|id)/i, '');
  }

  // 4. Convert $1, $2, ... to ?
  sql = sql.replace(/\$\d+/g, '?');

  const isInsert = /^\s*INSERT\s+INTO/i.test(sql);
  const isUpdate = /^\s*UPDATE/i.test(sql);
  const isDelete = /^\s*DELETE\s+FROM/i.test(sql);

  if (isInsert && hasReturningStar) {
    const tableMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
    const tableName = tableMatch ? tableMatch[1] : null;

    const [result] = await pool.execute(sql, params);
    if (tableName && result.insertId) {
      const [rows] = await pool.execute(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [result.insertId]);
      const normalized = rows.map(normalizeRow);
      return { rows: normalized, rowCount: normalized.length };
    }
    return { rows: [{ id: result.insertId }], rowCount: 1 };
  }

  if (isUpdate && hasReturningStar) {
    const tableMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
    const tableName = tableMatch ? tableMatch[1] : null;
    const id = params[params.length - 1];

    const [result] = await pool.execute(sql, params);
    if (tableName && id) {
      const [rows] = await pool.execute(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [id]);
      if (rows.length === 0) {
        return { rows: [], rowCount: 0 };
      }
      const normalized = rows.map(normalizeRow);
      return { rows: normalized, rowCount: normalized.length };
    }
    return { rows: [], rowCount: 0 };
  }

  if (isDelete && (hasReturningStar || hasReturningId)) {
    const id = params[0];
    const [result] = await pool.execute(sql, params);
    if (result.affectedRows > 0) {
      return { rows: [{ id }], rowCount: result.affectedRows };
    }
    return { rows: [], rowCount: 0 };
  }

  const [rows] = await pool.query(sql, params);
  if (Array.isArray(rows)) {
    const normalized = rows.map(normalizeRow);
    return { rows: normalized, rowCount: normalized.length };
  }
  return { rows: [], rowCount: rows.affectedRows || 0 };
}

module.exports = {
  query,
  pool,
};
