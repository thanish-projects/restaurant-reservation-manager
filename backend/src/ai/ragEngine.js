'use strict';

/**
 * ragEngine.js
 * Retrieval-Augmented Generation (RAG) Engine.
 *
 * Retrieves live data from MySQL and formats it into structured
 * natural-language context strings injected into agent prompts.
 *
 * No vector database needed — pure SQL retrieval with semantic formatting.
 */

const db = require('../config/db');
const logger = require('../config/logger');

/**
 * Builds a comprehensive restaurant context document from live DB data.
 * This is the "knowledge base" injected into agent prompts.
 *
 * @param {object} options
 * @param {string} [options.targetDate]   - YYYY-MM-DD date to focus on (optional)
 * @param {string} [options.contextType]  - 'bookings' | 'tables' | 'full'
 * @returns {Promise<string>} Formatted context string
 */
async function buildContext({ targetDate = null, contextType = 'full' } = {}) {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const focusDate = targetDate || today;
    const sections = [];

    // ── Section 1: Restaurant Overview ──────────────────────────────────────
    const [tableStats] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance,
          MAX(capacity) AS max_capacity,
          MIN(capacity) AS min_capacity
        FROM restaurant_tables
      `),
    ]);

    const stats = tableStats.rows[0];
    sections.push(
      `RESTAURANT OVERVIEW (as of ${today}):\n` +
      `- Total tables: ${stats.total} | Available: ${stats.available} | Under maintenance: ${stats.maintenance}\n` +
      `- Party size range supported: ${stats.min_capacity}–${stats.max_capacity} guests`
    );

    // ── Section 2: All Tables (for table queries) ────────────────────────────
    if (contextType === 'tables' || contextType === 'full') {
      const tablesResult = await db.query(`
        SELECT table_number, capacity, location, status
        FROM restaurant_tables
        ORDER BY table_number
      `);

      if (tablesResult.rows.length > 0) {
        const tableLines = tablesResult.rows.map((t) =>
          `  - Table ${t.table_number}: capacity=${t.capacity}, location=${t.location}, status=${t.status}`
        );
        sections.push(`ALL TABLES:\n${tableLines.join('\n')}`);
      }
    }

    // ── Section 3: Bookings for focus date ──────────────────────────────────
    if (contextType === 'bookings' || contextType === 'full') {
      const bookingsResult = await db.query(`
        SELECT
          b.id, b.guest_name, b.party_size,
          b.booking_time, b.status, b.notes,
          t.table_number, t.capacity, t.location
        FROM bookings b
        JOIN restaurant_tables t ON t.id = b.table_id
        WHERE b.booking_date = ?
        ORDER BY b.booking_time
      `, [focusDate]);

      if (bookingsResult.rows.length > 0) {
        const bookingLines = bookingsResult.rows.map((b) =>
          `  - ${b.booking_time} | Table ${b.table_number} (${b.location}, cap ${b.capacity}) | ` +
          `${b.guest_name}, party of ${b.party_size} | Status: ${b.status}` +
          (b.notes ? ` | Notes: ${b.notes}` : '')
        );
        sections.push(`BOOKINGS FOR ${focusDate}:\n${bookingLines.join('\n')}`);
      } else {
        sections.push(`BOOKINGS FOR ${focusDate}:\n  - No bookings found for this date.`);
      }

      // ── Section 4: Available time slots for focus date ───────────────────
      const allTables = await db.query(`
        SELECT id, table_number, capacity, location FROM restaurant_tables WHERE status = 'available'
      `);
      const bookedSlots = await db.query(`
        SELECT table_id, booking_time FROM bookings
        WHERE booking_date = ? AND status = 'confirmed'
      `, [focusDate]);

      const bookedMap = new Set(bookedSlots.rows.map((b) => `${b.table_id}-${b.booking_time}`));
      const commonSlots = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00'];

      const availabilityLines = [];
      for (const slot of commonSlots) {
        const freeTables = allTables.rows.filter(
          (t) => !bookedMap.has(`${t.id}-${slot}`) && !bookedMap.has(`${t.id}-${slot}:00`)
        );
        if (freeTables.length > 0) {
          const tableNums = freeTables.map((t) => `Table ${t.table_number}(cap ${t.capacity})`).join(', ');
          availabilityLines.push(`  - ${slot}: ${freeTables.length} table(s) free — ${tableNums}`);
        } else {
          availabilityLines.push(`  - ${slot}: Fully booked`);
        }
      }
      sections.push(`AVAILABILITY FOR ${focusDate} (common slots):\n${availabilityLines.join('\n')}`);
    }

    // ── Section 5: Recent booking trend (last 7 days) ────────────────────────
    if (contextType === 'full') {
      const recentResult = await db.query(`
        SELECT COUNT(*) AS count, status FROM bookings
        WHERE booking_date >= DATE_SUB(?, INTERVAL 7 DAY) AND booking_date <= ?
        GROUP BY status
      `, [today, today]);

      if (recentResult.rows.length > 0) {
        const trendLines = recentResult.rows.map((r) => `  - ${r.status}: ${r.count}`);
        sections.push(`BOOKING TREND (last 7 days):\n${trendLines.join('\n')}`);
      }
    }

    const context = sections.join('\n\n');
    logger.info(`[RAG] Context built: ${context.length} chars, date=${focusDate}, type=${contextType}`);
    return context;

  } catch (err) {
    logger.error(`[RAG] Context build failed: ${err.message}`);
    // Return a minimal fallback so agents can still respond gracefully
    return `RESTAURANT CONTEXT: Unable to retrieve live data at this moment. Please try again shortly.`;
  }
}

/**
 * Extracts a date from user message text using simple regex patterns.
 * Used to focus RAG retrieval on the relevant date.
 *
 * @param {string} message
 * @returns {string|null} YYYY-MM-DD or null
 */
function extractDateFromMessage(message) {
  const today = new Date();

  // Relative keywords
  if (/\btoday\b/i.test(message)) {
    return today.toISOString().substring(0, 10);
  }
  if (/\btomorrow\b/i.test(message)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().substring(0, 10);
  }

  // Day-of-week keywords
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (new RegExp(`\\b${days[i]}\\b`, 'i').test(message)) {
      const d = new Date(today);
      const diff = (i - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().substring(0, 10);
    }
  }

  // Explicit YYYY-MM-DD
  const isoMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return null;
}

module.exports = { buildContext, extractDateFromMessage };
