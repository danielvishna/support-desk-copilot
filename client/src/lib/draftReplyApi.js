/**
 * @fileoverview Thin fetch wrapper for POST /api/draft-reply. Reads the
 * streamed response body chunk by chunk and forwards each to `onChunk`, so
 * the caller can append it to the draft as it arrives. Separate from
 * triageApi.js - different response shape (streamed text vs one JSON body).
 */

/** @const {string} */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * @typedef {Object} StreamReplyResult
 * @property {boolean} success
 * @property {string=} error User-facing message (only when !success).
 * @property {boolean=} retryable
 * @property {boolean=} aborted True when the caller's AbortSignal cancelled
 *     the request (the Stop button) - not treated as a failure.
 */

/**
 * @param {{id: string, customer: string, subject: string, message: string}}
 *     ticket
 * @param {{priority: (string|null), category: (string|null)}} triage
 * @param {string} apiKey
 * @param {{onChunk: function(string): void, signal: AbortSignal}} options
 * @return {Promise<StreamReplyResult>}
 */
export async function streamReplyDraft(ticket, triage, apiKey, { onChunk, signal }) {
  let response
  try {
    response = await fetch(`${API_URL}/api/draft-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': apiKey },
      body: JSON.stringify({ ...ticket, priority: triage.priority, category: triage.category }),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, aborted: true }
    return { success: false, error: 'Could not reach the server. Check your connection and the API URL.', retryable: true }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    return { success: false, error: data.error ?? `Request failed (${response.status})`, retryable: Boolean(data.retryable) }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onChunk(decoder.decode(value, { stream: true }))
    }
  } catch (err) {
    if (err.name === 'AbortError' || signal.aborted) return { success: false, aborted: true }
    return { success: false, error: 'The connection dropped while generating the reply.', retryable: true }
  }

  return { success: true }
}
