/**
 * @fileoverview POST /api/draft-reply - streams a reply draft for one
 * ticket as plain text. The client reads the response body as a stream and
 * appends chunks to the draft as they arrive; aborting the client fetch
 * closes the connection, which this handler detects via `req.on('close')`
 * to cancel the upstream Gemini request too (the brief's Stop-button rule).
 */

import { Router } from 'express'
import { streamGeminiText } from '../ai/geminiClient.js'
import { classifyGeminiError } from '../ai/geminiError.js'
import { buildReplyPrompt } from '../ai/replyPrompt.js'
import { parseTicket } from '../validation/ticketSchema.js'

const router = Router()

/**
 * @param {import('express').Request} req
 * @return {string|null}
 */
function resolveApiKey(req) {
  return req.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || null
}

/**
 * Request body: ticket fields (see validation/ticketSchema.js) plus
 * optional `priority`/`category`/`reason` for tone context. Caller's
 * Gemini key goes in the `x-gemini-api-key` header.
 * Success: `200 text/plain`, streamed in chunks.
 * Failure before any text was sent: `400`/`401`/`502` JSON `{error,
 * retryable?}`. Failure mid-stream: the connection just ends early (see
 * ai/geminiError.js for why we can't change the status code by then).
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

  const { priority, category, reason } = req.body
  const prompt = buildReplyPrompt(ticketResult.data, { priority, category, reason })

  // res.on('close') - not req.on('close') - tracks the actual connection:
  // req's body stream closes as soon as express.json() finishes reading it,
  // long before the client disconnects, which made req-based cancellation
  // fire immediately and abort every request (caught during local testing).
  const abortController = new AbortController()
  res.on('close', () => abortController.abort())

  let wroteAnything = false
  try {
    const chunks = streamGeminiText({
      apiKey,
      systemInstruction: prompt.systemInstruction,
      contents: prompt.contents,
      callerSignal: abortController.signal,
    })

    for await (const text of chunks) {
      if (!wroteAnything) {
        res.status(200)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        wroteAnything = true
      }
      res.write(text)
    }
    res.end()
  } catch (err) {
    if (res.writableEnded) return
    if (abortController.signal.aborted && !wroteAnything) {
      // Client (or our own timeout) cancelled before anything was sent.
      return res.end()
    }
    if (!wroteAnything) {
      const classified = classifyGeminiError(err.message)
      console.error('Gemini streaming error for ticket', ticketResult.data.id, err.message)
      return res.status(502).json({ error: classified.userMessage, retryable: classified.retryable })
    }
    // Error after we'd already started streaming text: the response is
    // already 200 with a body in flight, so the only honest option left is
    // to end the connection - the client treats an early end as "done" and
    // the user can see the draft is incomplete and regenerate.
    console.error('Gemini streaming error mid-stream for ticket', ticketResult.data.id, err.message)
    res.end()
  }
})

export default router
