const db = require('../config/db');
const logger = require('../config/logger');
const { isValidEmail, isValidPhone, isValidDate, isValidTime } = require('../utils/validators');

const VALID_STATUS = ['confirmed', 'cancelled', 'completed'];

function validateBooking(body) {
  const errors = [];

  if (!Number.isInteger(Number(body.table_id)) || Number(body.table_id) <= 0) {
    errors.push('table_id is required');
  }
  if (!body.guest_name || body.guest_name.trim().length < 2) {
    errors.push('guest_name must be at least 2 characters');
  }
  if (!isValidEmail(body.guest_email)) {
    errors.push('guest_email is not a valid email');
  }
  if (!isValidPhone(body.guest_phone)) {
    errors.push('guest_phone must be exactly 10 digits');
  }
  if (!Number.isInteger(Number(body.party_size)) || Number(body.party_size) <= 0) {
    errors.push('party_size must be a positive whole number');
  }
  if (!isValidDate(body.booking_date)) {
    errors.push('booking_date must be in YYYY-MM-DD format');
  }
  if (!isValidTime(body.booking_time)) {
    errors.push('booking_time must be in HH:MM format');
  }
  if (body.status && !VALID_STATUS.includes(body.status)) {
    errors.push('status must be confirmed, cancelled or completed');
  }
  return errors;
}

// Checks the table exists, is usable, fits the party and is free at that slot.
// Returns an error message string, or null when everything is fine.
async function checkTableAvailability(body, ignoreBookingId) {
  const tableResult = await db.query('SELECT * FROM restaurant_tables WHERE id = $1', [
    body.table_id,
  ]);
  const table = tableResult.rows[0];

  if (!table) {
    return 'Selected table does not exist';
  }
  if (table.status !== 'available') {
    return 'Selected table is under maintenance';
  }
  if (Number(body.party_size) > table.capacity) {
    return `Table ${table.table_number} seats only ${table.capacity} guests`;
  }

  const params = [body.table_id, body.booking_date, body.booking_time];
  let sql = `SELECT id FROM bookings
             WHERE table_id = $1 AND booking_date = $2 AND booking_time = $3
             AND status = 'confirmed'`;
  if (ignoreBookingId) {
    params.push(ignoreBookingId);
    sql += ` AND id <> $${params.length}`;
  }
  const clash = await db.query(sql, params);
  if (clash.rows.length > 0) {
    return 'This table is already booked for the selected date and time';
  }
  return null;
}

async function getBookings(req, res, next) {
  try {
    const { date, status, table_id, search } = req.query;
    const conditions = [];
    const params = [];

    if (date) {
      params.push(date);
      conditions.push(`b.booking_date = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }
    if (table_id) {
      params.push(Number(table_id));
      conditions.push(`b.table_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(b.guest_name ILIKE $${params.length} OR b.guest_email ILIKE $${params.length})`
      );
    }

    let sql = `SELECT b.id, b.table_id, t.table_number, b.guest_name, b.guest_email,
                      b.guest_phone, b.party_size,
                      to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
                      to_char(b.booking_time, 'HH24:MI') AS booking_time,
                      b.status, b.notes
               FROM bookings b JOIN restaurant_tables t ON t.id = b.table_id`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY b.booking_date DESC, b.booking_time DESC';

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, table_id, guest_name, guest_email, guest_phone, party_size,
              to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
              to_char(booking_time, 'HH24:MI') AS booking_time, status, notes
       FROM bookings WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function createBooking(req, res, next) {
  try {
    const errors = validateBooking(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const problem = await checkTableAvailability(req.body, null);
    if (problem) {
      logger.warn(`Booking rejected: ${problem}`);
      return res.status(409).json({ message: problem });
    }

    const b = req.body;
    const result = await db.query(
      `INSERT INTO bookings
        (table_id, guest_name, guest_email, guest_phone, party_size, booking_date, booking_time, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        b.table_id,
        b.guest_name.trim(),
        b.guest_email,
        b.guest_phone,
        b.party_size,
        b.booking_date,
        b.booking_time,
        b.status || 'confirmed',
        b.notes || null,
      ]
    );
    logger.info(`Booking created: id ${result.rows[0].id} by ${req.user.username}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateBooking(req, res, next) {
  try {
    const errors = validateBooking(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Only a confirmed booking can clash with another one.
    if (!req.body.status || req.body.status === 'confirmed') {
      const problem = await checkTableAvailability(req.body, req.params.id);
      if (problem) {
        logger.warn(`Booking update rejected: ${problem}`);
        return res.status(409).json({ message: problem });
      }
    }

    const b = req.body;
    const result = await db.query(
      `UPDATE bookings SET table_id=$1, guest_name=$2, guest_email=$3, guest_phone=$4,
         party_size=$5, booking_date=$6, booking_time=$7, status=$8, notes=$9
       WHERE id=$10 RETURNING *`,
      [
        b.table_id,
        b.guest_name.trim(),
        b.guest_email,
        b.guest_phone,
        b.party_size,
        b.booking_date,
        b.booking_time,
        b.status || 'confirmed',
        b.notes || null,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    logger.info(`Booking updated: id ${req.params.id} by ${req.user.username}`);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteBooking(req, res, next) {
  try {
    const result = await db.query('DELETE FROM bookings WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    logger.info(`Booking deleted: id ${req.params.id} by ${req.user.username}`);
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  validateBooking,
};
