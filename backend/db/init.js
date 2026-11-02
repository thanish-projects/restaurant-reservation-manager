// Run with: npm run db:init
// Creates tables and a default admin user (admin / admin123) plus sample tables.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { getMysqlConfig } = require('../src/config/mysqlConfig');

async function main() {
  const { database: dbName, ...dbConfig } = getMysqlConfig();

  // 1. Ensure the database exists
  const tempConn = await mysql.createConnection(dbConfig);
  await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
  await tempConn.end();

  // 2. Connect to the database
  const connection = await mysql.createConnection({
    ...dbConfig,
    database: dbName,
  });

  // 3. Run schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await connection.query(schema);

  // 4. Seed admin user
  const hash = await bcrypt.hash('admin123', 10);
  await connection.execute(
    `INSERT IGNORE INTO users (username, password_hash) VALUES (?, ?)`,
    ['admin', hash]
  );

  // 5. Seed sample tables
  const sample = [
    [1, 2, 'indoor'],
    [2, 4, 'indoor'],
    [3, 4, 'outdoor'],
    [4, 6, 'indoor'],
    [5, 8, 'private'],
  ];
  for (const [num, cap, loc] of sample) {
    await connection.execute(
      `INSERT IGNORE INTO restaurant_tables (table_number, capacity, location)
       VALUES (?, ?, ?)`,
      [num, cap, loc]
    );
  }

  console.log('Database ready. Login with admin / admin123');
  await connection.end();
}

main().catch((err) => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
