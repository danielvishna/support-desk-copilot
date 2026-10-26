import { Router } from 'express'
import { callGeminiJson } from '../ai/geminiClient.js'
import { buildTriagePrompt, TRIAGE_RESPONSE_SCHEMA } from '../ai/triagePrompt.js'
import { parseTicket } from '../validation/ticketSchema.js'
import { parseTriageResult } from '../validation/triageResultSchema.js'

const router = Router()

function resolveApiKey(req) {
  return req.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || null
}

// 503 (model overloaded) and 429 (rate limited) are transient - worth one
// retry. Anything else (bad key, bad request, not-found model) will just
// fail the same way again, so don't waste a second call on it.
function isRetryableApiError(message) {
  return /"code":\s*(503|429)/.test(message ?? '')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

  // Call the model once. Returns either a parsed+validated result, or a
  // tagged failure so the caller can decide whether retrying makes sense.
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
  if (!result.success) {
    // One retry total, but only when it's worth it: malformed JSON, or a
    // transient API error (model overloaded / rate limited).
    const shouldRetry =
      result.kind === 'invalid_json' ||
      (result.kind === 'api_error' && isRetryableApiError(result.error))
    if (shouldRetry) {
      if (result.kind === 'api_error') await sleep(1000)
      result = await attempt()
    }
  }

  if (!result.success) {
    if (result.kind === 'api_error') {
      console.error(`Gemini API error for ticket ${ticketResult.data.id}:`, result.error)
      return res.status(502).json({
        error: 'The AI provider could not be reached. Check your API key and quota.',
        ticketId: ticketResult.data.id,
        needsReview: true,
      })
    }
    return res.status(502).json({
      error: 'Could not get a valid triage result from the model',
      ticketId: ticketResult.data.id,
      needsReview: true,
    })
  }

  res.json({ ticketId: ticketResult.data.id, ...result.data })
})

export default router
