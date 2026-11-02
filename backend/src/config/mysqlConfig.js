const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function getMysqlConfig() {
  let urlConfig = {};
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith('mysql')) {
    let url;
    try {
      url = new URL(databaseUrl);
    } catch {
      throw new Error('DATABASE_URL is not a valid MySQL URL');
    }

    urlConfig = {
      host: url.hostname,
      port: Number(url.port),
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database: url.pathname.length > 1 ? decodeURIComponent(url.pathname.slice(1)) : undefined,
    };
  }

  return {
    host: process.env.DB_HOST || urlConfig.host || 'localhost',
    port: Number(process.env.DB_PORT || urlConfig.port) || 3306,
    user: process.env.DB_USER || urlConfig.user || 'root',
    password: process.env.DB_PASSWORD === undefined
      ? (urlConfig.password === undefined ? 'root123' : urlConfig.password)
      : process.env.DB_PASSWORD,
    database: process.env.DB_NAME || urlConfig.database || 'reservation_db',
  };
}

module.exports = { getMysqlConfig };
