'use strict';

/**
 * orchestrator.js
 * Master pipeline that wires all agents together.
 *
 * Flow:
 *  1. OrchestratorAgent classifies intent + extracts entities (gemini-3.8-flash)
 *  2. RAG Engine fetches live context from MySQL
 *  3. Correct sub-agent generates the final response
 *     - BookingAgent  (gemini-3.7-flash) for booking queries
 *     - TableAgent    (gemini-3.7-flash) for table queries
 *     - FAQAgent      (gemini-2.5-flash) for general questions
 *
 * All models use FreeLLMAPI — zero Antigravity credits consumed.
 */

const orchestratorAgent = require('./agents/orchestratorAgent');
const bookingAgent      = require('./agents/bookingAgent');
const tableAgent        = require('./agents/tableAgent');
const faqAgent          = require('./agents/faqAgent');
const ragEngine         = require('./ragEngine');
const logger            = require('../config/logger');

function getEnv(key, defaultVal) {
  return (global.process && global.process.env && global.process.env[key]) || defaultVal;
}

/**
 * Processes a user message through the full multi-agent pipeline.
 *
 * @param {string} userMessage
 * @param {Array}  [conversationHistory=[]]  - [{role:'user'|'assistant', content:string}]
 * @returns {Promise<{
 *   reply: string,
 *   agent: string,
 *   intent: string,
 *   model: string,
 *   contextUsed: boolean,
 *   entities: object,
 *   confidence: number
 * }>}
 */
async function processMessage(userMessage, conversationHistory = []) {
  logger.info(`[Orchestrator] Processing: "${userMessage.substring(0, 80)}"`);

  // Safe defaults — used if classification fails
  let intent     = 'faq';
  let confidence = 0.3;
  let entities   = { date: null, time: null, party_size: null, table_number: null, guest_name: null, action: null };
  let route_to   = 'faq_agent';

  // ── Step 1: Intent classification & entity extraction ─────────────────────
  try {
    const classification = await orchestratorAgent.classify(userMessage, conversationHistory);
    intent     = classification.intent     || intent;
    confidence = classification.confidence || confidence;
    entities   = classification.entities   || entities;
    route_to   = classification.route_to   || route_to;
  } catch (classifyErr) {
    logger.warn(`[Orchestrator] Classification failed (${classifyErr.message}), defaulting to faq_agent`);
  }

  // ── Step 2: RAG context retrieval ─────────────────────────────────────────
  let ragContext   = null;
  const needsContext = route_to !== 'faq_agent';

  if (needsContext) {
    try {
      const contextType  = route_to === 'booking_agent' ? 'bookings' : 'tables';
      const targetDate   = entities?.date || ragEngine.extractDateFromMessage(userMessage);
      ragContext = await ragEngine.buildContext({ targetDate, contextType });
    } catch (ragErr) {
      logger.warn(`[Orchestrator] RAG context failed (${ragErr.message}), proceeding without context`);
    }
  }

  // ── Step 3: Route to correct sub-agent ────────────────────────────────────
  let reply;
  let agentName;
  let modelUsed;

  try {
    if (route_to === 'booking_agent') {
      agentName = 'booking_agent';
      modelUsed = getEnv('FREELLMAPI_BOOKING_MODEL', 'gemini-3.7-flash');
      reply = await bookingAgent.respond({ userMessage, ragContext, entities, conversationHistory });

    } else if (route_to === 'table_agent') {
      agentName = 'table_agent';
      modelUsed = getEnv('FREELLMAPI_TABLE_MODEL', 'gemini-3.7-flash');
      reply = await tableAgent.respond({ userMessage, ragContext, entities, conversationHistory });

    } else {
      agentName = 'faq_agent';
      modelUsed = getEnv('FREELLMAPI_FAQ_MODEL', 'gemini-2.5-flash');
      reply = await faqAgent.respond({ userMessage, conversationHistory });
    }

    logger.info(`[Orchestrator] Done | agent=${agentName} intent=${intent} confidence=${confidence}`);

    return { reply, agent: agentName, intent, model: modelUsed, contextUsed: needsContext, entities, confidence };

  } catch (agentErr) {
    logger.error(`[Orchestrator] Sub-agent ${route_to} failed: ${agentErr.message}`);

    // Fallback: try FAQ agent (lightest, most reliable)
    if (route_to !== 'faq_agent') {
      try {
        logger.warn(`[Orchestrator] Falling back to FAQ agent`);
        reply = await faqAgent.respond({ userMessage, conversationHistory });
        return { reply, agent: 'faq_agent_fallback', intent, model: getEnv('FREELLMAPI_FAQ_MODEL', 'gemini-2.5-flash'), contextUsed: false, entities, confidence: 0.1 };
      } catch (fallbackErr) {
        logger.error(`[Orchestrator] FAQ fallback also failed: ${fallbackErr.message}`);
      }
    }

    // Final fallback — static error message
    return {
      reply: "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again in a moment.",
      agent: 'error',
      intent: 'error',
      model: 'none',
      contextUsed: false,
      entities,
      confidence: 0,
    };
  }
}

module.exports = {
  process: processMessage,
};
