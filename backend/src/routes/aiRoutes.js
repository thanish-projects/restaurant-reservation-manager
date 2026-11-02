'use strict';

/**
 * aiRoutes.js
 * Express routes for the AI multi-agent chat system.
 *
 * POST /api/ai/chat  — Main chat endpoint (requires JWT auth)
 * GET  /api/ai/health — Quick health check for the AI subsystem
 */

const express = require('express');
const orchestrator = require('../ai/orchestrator');
const authenticate = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

/**
 * POST /api/ai/chat
 * Body: { message: string, conversationHistory?: [{role, content}] }
 * Auth: Bearer JWT required
 */
router.post('/chat', authenticate, async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'message is required and must be a non-empty string' });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ message: 'message must be 2000 characters or fewer' });
    }

    if (!Array.isArray(conversationHistory)) {
      return res.status(400).json({ message: 'conversationHistory must be an array' });
    }

    // Limit history to last 10 turns to avoid token bloat
    const trimmedHistory = conversationHistory.slice(-10);

    logger.info(`[AI Chat] User: ${req.user.username} | msg length: ${message.length}`);

    const result = await orchestrator.process(message.trim(), trimmedHistory);

    return res.json({
      reply: result.reply,
      agent: result.agent,
      intent: result.intent,
      model: result.model,
      contextUsed: result.contextUsed,
      entities: result.entities,
      confidence: result.confidence,
    });

  } catch (err) {
    logger.error(`[AI Chat] Unhandled error: ${err.message}`);
    next(err);
  }
});

/**
 * GET /api/ai/health
 * Returns the status of the AI subsystem and configured models.
 * No auth required — used by frontend to check AI availability.
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    freellmapi_url: process.env.FREELLMAPI_URL || 'not configured',
    models: {
      orchestrator: process.env.FREELLMAPI_ORCHESTRATOR_MODEL || 'gemini-3.8-flash',
      booking_agent: process.env.FREELLMAPI_BOOKING_MODEL || 'gemini-3.7-flash',
      table_agent: process.env.FREELLMAPI_TABLE_MODEL || 'gemini-3.7-flash',
      faq_agent: process.env.FREELLMAPI_FAQ_MODEL || 'gemini-2.5-flash',
    },
  });
});

module.exports = router;
