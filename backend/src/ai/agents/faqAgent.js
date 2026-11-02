'use strict';

/**
 * faqAgent.js
 * General FAQ agent powered by gemini-2.5-flash (lighter model for simple Q&A).
 *
 * Handles general restaurant questions that don't require live DB context.
 * Uses minimal tokens to keep FreeLLMAPI usage efficient.
 */

const { chatCompletion } = require('../freellmapi');
const logger = require('../../config/logger');

const MODEL = process.env.FREELLMAPI_FAQ_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are the Restaurant Assistant AI for a restaurant reservation management system.
You help with general questions about the restaurant.

The restaurant uses an online reservation management system where staff can:
- Manage table reservations (create, update, cancel)
- View all bookings by date, status, or guest name
- Manage table configurations (indoor, outdoor, private sections)
- Track table availability in real-time

Restaurant details you can share:
- We accept reservations for indoor, outdoor, and private dining sections
- Tables range from small (2-person) to large group tables
- Bookings can be confirmed, cancelled, or marked as completed
- Guests provide their name, email, phone, and party size when booking
- The system tracks all reservations to prevent double-bookings

If a question requires live data (specific availability, current bookings),
politely inform the user that this is handled by our booking or table assistants
and suggest they ask more specifically about dates or tables.

Be warm, helpful, and professional. Keep responses concise (under 150 words).`;

/**
 * Generates a FAQ/general response.
 *
 * @param {string} userMessage
 * @param {Array}  conversationHistory
 * @returns {Promise<string>} Agent reply
 */
async function respond({ userMessage, conversationHistory = [] }) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-4),
    { role: 'user', content: userMessage },
  ];

  try {
    const reply = await chatCompletion({
      model: MODEL,
      fallbackModel: process.env.FREELLMAPI_FAQ_FALLBACK || 'gemini-3.1-flash-lite',
      messages,
      temperature: 0.5,
      max_tokens: 350,
    });

    logger.info(`[FAQAgent] Responded to general query`);
    return reply;
  } catch (err) {
    logger.error(`[FAQAgent] Error: ${err.message}`);
    throw err;
  }
}

module.exports = { respond };
