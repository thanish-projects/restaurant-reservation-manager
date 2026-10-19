const db = require('../config/db');
const logger = require('../config/logger');

const VALID_LOCATIONS = ['indoor', 'outdoor', 'private'];
const VALID_STATUS = ['available', 'maintenance'];

function validateTable(body) {
  const errors = [];
  const tableNumber = Number(body.table_number);
  const capacity = Number(body.capacity);

  if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
    errors.push('table_number must be a positive whole number');
  }
  if (!Number.isInteger(capacity) || capacity <= 0) {
    errors.push('capacity must be a positive whole number');
  }
  if (body.location && !VALID_LOCATIONS.includes(body.location)) {
    errors.push('location must be indoor, outdoor or private');
  }
  if (body.status && !VALID_STATUS.includes(body.status)) {
    errors.push('status must be available or maintenance');
  }
  return errors;
}

async function getTables(req, res, next) {
  try {
    const { location, status, minCapacity } = req.query;
    const conditions = [];
    const params = [];

    if (location) {
      params.push(location);
      conditions.push(`location = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (minCapacity) {
      params.push(Number(minCapacity));
      conditions.push(`capacity >= $${params.length}`);
    }

    let sql = 'SELECT * FROM restaurant_tables';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY table_number';

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getTableById(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM restaurant_tables WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function createTable(req, res, next) {
  try {
    const errors = validateTable(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    const { table_number, capacity, location = 'indoor', status = 'available' } = req.body;
    const result = await db.query(
      `INSERT INTO restaurant_tables (table_number, capacity, location, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [table_number, capacity, location, status]
    );
    logger.info(`Table created: #${table_number} by ${req.user.username}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateTable(req, res, next) {
  try {
    const errors = validateTable(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    const { table_number, capacity, location = 'indoor', status = 'available' } = req.body;
    const result = await db.query(
      `UPDATE restaurant_tables
       SET table_number = $1, capacity = $2, location = $3, status = $4
       WHERE id = $5 RETURNING *`,
      [table_number, capacity, location, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }
    logger.info(`Table updated: id ${req.params.id} by ${req.user.username}`);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteTable(req, res, next) {
  try {
    const result = await db.query('DELETE FROM restaurant_tables WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }
    logger.info(`Table deleted: id ${req.params.id} by ${req.user.username}`);
    res.json({ message: 'Table deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTables, getTableById, createTable, updateTable, deleteTable, validateTable };
