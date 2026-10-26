/**
 * @fileoverview POST /api/triage - classifies one ticket (priority,
 * category, reason) via Gemini. Thin route handler: validation lives in
 * validation/, the model call in ai/geminiClient.js, prompt/schema in
 * ai/triagePrompt.js, and error classification in ai/geminiError.js.
 */

import { Router } from 'express'
import { classifyGeminiError } from '../ai/geminiError.js'
import { callGeminiJson } from '../ai/geminiClient.js'
import { buildTriagePrompt, TRIAGE_RESPONSE_SCHEMA } from '../ai/triagePrompt.js'
import { parseTicket } from '../validation/ticketSchema.js'
import { parseTriageResult } from '../validation/triageResultSchema.js'

const router = Router()

/**
 * Reads the caller-supplied Gemini key, falling back to the server's own
 * `GEMINI_API_KEY` env var for local/dev convenience (see .env.example).
 * @param {import('express').Request} req
 * @return {string|null}
 */
function resolveApiKey(req) {
  return req.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || null
}

/**
 * @param {number} ms
 * @return {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Request body: `{id, customer, subject, message}` (see
 * validation/ticketSchema.js). Caller's Gemini key goes in the
 * `x-gemini-api-key` header.
 * Success (200): `{ticketId, priority, category, reason}`.
 * Failure (400/401/502): `{error, ticketId?, needsReview?, retryable?}`.
 */
router.post('/', async (req, res) => {
  const apiKey = resolveApiKey(req)
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing Gemini API key' })
  }

  const ticketResult = parseTicket(req.body)
  if (!ticketResult.success) {
    return res.status(400).json({ error: ticketResult.error })
  }

  const prompt = buildTriagePrompt(ticketResult.data)

  /**
   * Calls the model once.
   * @return {Promise<{success: true, data: Object}|
   *     {success: false, kind: 'api_error'|'invalid_json', error: string}>}
   */
  const attempt = async () => {
    let rawText
    try {
      rawText = await callGeminiJson({
        apiKey,
        systemInstruction: prompt.systemInstruction,
        contents: prompt.contents,
        responseSchema: TRIAGE_RESPONSE_SCHEMA,
      })
    } catch (err) {
      return { success: false, kind: 'api_error', error: err.message }
    }
    const parsed = parseTriageResult(rawText)
    return parsed.success ? parsed : { ...parsed, kind: 'invalid_json' }
  }

  let result = await attempt()
  let classified = result.success || result.kind !== 'api_error' ? null : classifyGeminiError(result.error)

  if (!result.success) {
    // One retry total, but only when it's worth it: malformed JSON, or a
    // transient API error (model overloaded / rate limited / timed out).
    const shouldRetry = result.kind === 'invalid_json' || classified?.retryable
    if (shouldRetry) {
      if (result.kind === 'api_error') await sleep(1000)
      result = await attempt()
      classified = result.success || result.kind !== 'api_error' ? null : classifyGeminiError(result.error)
    }
  }

  if (!result.success) {
    if (result.kind === 'api_error') {
      console.error(`Gemini API error for ticket ${ticketResult.data.id}:`, result.error)
      return res.status(502).json({
        error: classified.userMessage,
        retryable: classified.retryable,
        ticketId: ticketResult.data.id,
        needsReview: true,
      })
    }
    return res.status(502).json({
      error: 'The AI did not return a valid triage result after retrying. The ticket needs manual review.',
      retryable: false,
      ticketId: ticketResult.data.id,
      needsReview: true,
    })
  }

  res.json({ ticketId: ticketResult.data.id, ...result.data })
})

export default router
