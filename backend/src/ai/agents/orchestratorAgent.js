'use strict';

/**
 * orchestratorAgent.js
 * The master agent powered by gemini-3.8-flash (highest reasoning).
 *
 * Responsibilities:
 *  - Classify the user's intent
 *  - Extract key entities (date, party size, table number, etc.)
 *  - Route to the correct sub-agent
 */

const { chatCompletion } = require('../freellmapi');
const logger = require('../../config/logger');

const MODEL = process.env.FREELLMAPI_ORCHESTRATOR_MODEL || 'gemini-3.8-flash';

const SYSTEM_PROMPT = `You are the Orchestrator AI for a restaurant reservation management system.
Your ONLY job is to classify the user's intent and extract entities from their message.

Respond with ONLY a valid JSON object in this exact format:
{
  "intent": "<one of: booking_query, table_query, faq, multi_intent, unclear>",
  "confidence": <0.0 to 1.0>,
  "entities": {
    "date": "<YYYY-MM-DD or null>",
    "time": "<HH:MM or null>",
    "party_size": <number or null>,
    "table_number": <number or null>,
    "guest_name": "<string or null>",
    "action": "<one of: check_availability, make_booking, cancel_booking, view_bookings, check_table, null>"
  },
  "route_to": "<one of: booking_agent, table_agent, faq_agent>"
}

Intent definitions:
- booking_query: Questions about reservations, availability, creating/cancelling bookings
- table_query: Questions about specific tables, capacity, location, maintenance status
- faq: General questions about the restaurant (hours, policies, cuisine, walk-ins, etc.)
- multi_intent: The user is asking about both bookings AND tables
- unclear: Cannot determine intent

Routing rules:
- booking_query → booking_agent
- table_query → table_agent
- faq → faq_agent
- multi_intent → booking_agent (it has the broadest context)
- unclear → faq_agent

Do NOT include any explanation text — ONLY the JSON object.`;

/**
 * Classifies user intent and extracts entities.
 *
 * @param {string} userMessage
 * @param {Array}  conversationHistory  - [{role, content}] previous turns
 * @returns {Promise<{intent, confidence, entities, route_to}>}
 */
async function classify(userMessage, conversationHistory = []) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    // Include last 2 turns of history for context
    ...conversationHistory.slice(-4),
    { role: 'user', content: userMessage },
  ];

  try {
    const raw = await chatCompletion({
      model: MODEL,
      fallbackModel: process.env.FREELLMAPI_ORCHESTRATOR_FALLBACK || 'gemini-3.1-flash-lite',
      messages,
      temperature: 0.1,
      max_tokens: 300,
    });

    // Strip markdown code fences if model adds them
    const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const result = JSON.parse(cleaned);

    logger.info(`[Orchestrator] intent=${result.intent} route=${result.route_to} confidence=${result.confidence}`);
    return result;
  } catch (err) {
    logger.error(`[Orchestrator] Classification failed: ${err.message}`);
    // Safe fallback
    return {
      intent: 'faq',
      confidence: 0.3,
      entities: { date: null, time: null, party_size: null, table_number: null, guest_name: null, action: null },
      route_to: 'faq_agent',
    };
  }
}

module.exports = { classify };
