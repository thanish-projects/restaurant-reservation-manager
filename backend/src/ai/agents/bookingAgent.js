'use strict';

/**
 * bookingAgent.js
 * Specialized agent for booking-related queries powered by gemini-3.7-flash.
 *
 * Receives live RAG context (bookings + availability) and answers questions
 * about reservations, available slots, conflict detection, and suggestions.
 */

const { chatCompletion } = require('../freellmapi');
const logger = require('../../config/logger');

const MODEL = process.env.FREELLMAPI_BOOKING_MODEL || 'gemini-3.7-flash';

const SYSTEM_PROMPT = `You are the Booking Assistant AI for a restaurant reservation system.
You help restaurant staff and guests with reservation-related questions.

You have access to LIVE restaurant data provided in the user message as "RESTAURANT CONTEXT".
Always use this live data to give accurate, specific answers.

Your capabilities:
- Check availability for specific dates, times, and party sizes
- Identify which tables are free or booked at any time slot
- Suggest the best available table for a given party size and preference
- Explain booking conflicts or why a slot is unavailable
- Summarize upcoming or today's bookings
- Help with cancellation or rescheduling information

Guidelines:
- Be concise, friendly, and professional
- Always reference specific table numbers and times when relevant
- If a table is not available, suggest alternatives
- If asked to "make a booking", explain that bookings are made through the reservation form in the app, but provide all the info needed
- Format times in 12-hour format with AM/PM for readability (e.g. 7:00 PM)
- Keep responses under 200 words unless a detailed list is needed`;

/**
 * Generates a booking-related response using live RAG context.
 *
 * @param {string} userMessage
 * @param {string} ragContext         - Live context from ragEngine
 * @param {object} entities           - Extracted entities from orchestrator
 * @param {Array}  conversationHistory
 * @returns {Promise<string>} Agent reply
 */
async function respond({ userMessage, ragContext, entities, conversationHistory = [] }) {
  const contextBlock = `\n\n--- RESTAURANT CONTEXT (live data) ---\n${ragContext}\n--- END CONTEXT ---\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-6),
    {
      role: 'user',
      content: userMessage + contextBlock,
    },
  ];

  try {
    const reply = await chatCompletion({
      model: MODEL,
      fallbackModel: process.env.FREELLMAPI_BOOKING_FALLBACK || 'gemini-3.1-flash-lite',
      messages,
      temperature: 0.4,
      max_tokens: 512,
    });

    logger.info(`[BookingAgent] Responded | entities=${JSON.stringify(entities)}`);
    return reply;
  } catch (err) {
    logger.error(`[BookingAgent] Error: ${err.message}`);
    throw err;
  }
}

module.exports = { respond };
