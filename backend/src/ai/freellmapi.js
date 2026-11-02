'use strict';

/**
 * freellmapi.js
 * Lightweight HTTP client for the local FreeLLMAPI server.
 * Uses Node's built-in `http` module — no extra npm packages needed.
 *
 * All LLM calls in this project route through here, ensuring
 * zero Antigravity credits are consumed.
 *
 * Features:
 *  - Automatic fallback to a secondary model on upstream provider errors
 *  - Configurable timeout
 *  - Detailed logging for every request/response
 */

const http = require('http');
const https = require('https');
const logger = require('../config/logger');

const BASE_URL = process.env.FREELLMAPI_URL || 'http://127.0.0.1:31415/v1';
const API_KEY  = process.env.FREELLMAPI_KEY  || '';
const DEFAULT_TIMEOUT_MS = 25000; // 60 seconds

/**
 * Makes a single POST request to FreeLLMAPI's /chat/completions endpoint.
 *
 * @param {object} opts
 * @param {string}  opts.model
 * @param {Array}   opts.messages
 * @param {number}  [opts.temperature=0.3]
 * @param {number}  [opts.max_tokens=1024]
 * @param {number}  [opts.timeout_ms]
 * @returns {Promise<string>} The assistant's reply text
 */
function _doRequest({ model, messages, temperature = 0.3, max_tokens = 1024, timeout_ms = DEFAULT_TIMEOUT_MS }) {
  const body = JSON.stringify({ model, messages, temperature, max_tokens });
  const url  = new URL(`${BASE_URL}/chat/completions`);

  const requestOptions = {
    hostname: url.hostname,
    port:     url.port || (url.protocol === 'https:' ? 443 : 80),
    path:     url.pathname + url.search,
    method:   'POST',
    headers: {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Authorization':  `Bearer ${API_KEY}`,
    },
  };

  logger.info(`[FreeLLMAPI] → model=${model} messages=${messages.length} max_tokens=${max_tokens}`);

  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(requestOptions, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) {
            const err = new Error(parsed.error.message || 'FreeLLMAPI error');
            err.code = parsed.error.code || 'api_error';
            err.isUpstreamError = (
              parsed.error.code === 'upstream_failed' ||
              parsed.error.type === 'provider_error'
            );
            return reject(err);
          }
          const reply = parsed?.choices?.[0]?.message?.content || '';
          logger.info(`[FreeLLMAPI] ← model=${parsed.model || model} tokens=${parsed.usage?.total_tokens ?? '?'}`);
          resolve(reply.trim());
        } catch (e) {
          logger.error(`[FreeLLMAPI] JSON parse error: ${e.message} | raw: ${raw.substring(0, 200)}`);
          reject(new Error(`FreeLLMAPI response parse failed: ${e.message}`));
        }
      });
    });

    req.setTimeout(timeout_ms, () => {
      req.destroy();
      reject(new Error(`FreeLLMAPI request timed out after ${timeout_ms}ms`));
    });

    req.on('error', (err) => {
      logger.error(`[FreeLLMAPI] Request error: ${err.message}`);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Calls FreeLLMAPI with automatic fallback to a secondary model
 * when the primary model has upstream provider issues.
 *
 * @param {object} options
 * @param {string}  options.model          - Primary FreeLLMAPI model id
 * @param {string}  [options.fallbackModel] - Fallback model id (used on upstream errors)
 * @param {Array}   options.messages
 * @param {number}  [options.temperature=0.3]
 * @param {number}  [options.max_tokens=1024]
 * @param {number}  [options.timeout_ms]
 * @returns {Promise<string>} The assistant's reply text
 */
async function chatCompletion({ model, fallbackModel, messages, temperature = 0.3, max_tokens = 1024, timeout_ms = DEFAULT_TIMEOUT_MS }) {
  try {
    return await _doRequest({ model, messages, temperature, max_tokens, timeout_ms });
  } catch (err) {
    // Only fall back on upstream/provider errors, not auth or validation errors
    if (fallbackModel && err.isUpstreamError) {
      logger.warn(`[FreeLLMAPI] Primary model ${model} failed (${err.message.substring(0, 80)}). Retrying with fallback: ${fallbackModel}`);
      return await _doRequest({ model: fallbackModel, messages, temperature, max_tokens, timeout_ms });
    }
    throw err;
  }
}

module.exports = { chatCompletion };
