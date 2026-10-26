/**
 * @fileoverview Thin fetch wrapper for POST /api/triage. Kept separate from
 * the reducer and from UI components so the HTTP/error-shape details live
 * in one place (CLAUDE.md: AI-calling code stays out of the UI layer).
 */

/** @const {string} */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * @typedef {Object} TriageApiResult
 * @property {boolean} success
 * @property {string=} priority
 * @property {string=} category
 * @property {string=} reason
 * @property {string=} quote Exact substring of the ticket message that
 *     justifies the priority, or "" if none/unverifiable (see the server's
 *     isQuoteGrounded).
 * @property {string=} error User-facing message (only when !success).
 * @property {boolean=} retryable
 */

/**
 * @param {{id: string, customer: string, subject: string, message: string}}
 *     ticket
 * @param {string} apiKey
 * @return {Promise<TriageApiResult>}
 */
export async function triageTicket(ticket, apiKey) {
  try {
    const response = await fetch(`${API_URL}/api/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': apiKey },
      body: JSON.stringify(ticket),
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error ?? `Request failed (${response.status})`, retryable: Boolean(data.retryable) }
    }
    return { success: true, priority: data.priority, category: data.category, reason: data.reason, quote: data.quote }
  } catch {
    return {
      success: false,
      error: 'Could not reach the server. Check your connection and the API URL.',
      retryable: true,
    }
  }
}
