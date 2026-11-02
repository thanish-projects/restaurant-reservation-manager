'use strict';

/**
 * tableAgent.js
 * Specialized agent for table-related queries powered by gemini-3.7-flash.
 *
 * Receives live RAG context (all tables) and answers questions about
 * table capacity, location, status, and configuration.
 */

const { chatCompletion } = require('../freellmapi');
const logger = require('../../config/logger');

const MODEL = process.env.FREELLMAPI_TABLE_MODEL || 'gemini-3.7-flash';

const SYSTEM_PROMPT = `You are the Table Management Assistant AI for a restaurant reservation system.
You help restaurant staff understand table configurations, capacity, and availability.

You have access to LIVE restaurant table data provided in the user message as "RESTAURANT CONTEXT".
Always use this live data to give accurate, specific answers.

Your capabilities:
- List tables by location (indoor, outdoor, private)
- Identify tables that can accommodate a given party size
- Report which tables are under maintenance
- Compare tables and recommend best options
- Explain table configurations and seating arrangements

Guidelines:
- Be concise, friendly, and professional
- Always reference specific table numbers in your answers
- Clearly distinguish between indoor, outdoor, and private sections
- Mention capacity when discussing specific tables
- If a table is under maintenance, proactively suggest alternatives
- Keep responses under 200 words unless listing multiple tables`;

/**
 * Generates a table-related response using live RAG context.
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
      fallbackModel: process.env.FREELLMAPI_TABLE_FALLBACK || 'gemini-3.1-flash-lite',
      messages,
      temperature: 0.3,
      max_tokens: 512,
    });

    logger.info(`[TableAgent] Responded | entities=${JSON.stringify(entities)}`);
    return reply;
  } catch (err) {
    logger.error(`[TableAgent] Error: ${err.message}`);
    throw err;
  }
}

module.exports = { respond };
