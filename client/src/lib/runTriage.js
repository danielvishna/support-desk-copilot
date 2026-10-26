/**
 * @fileoverview Drives triage for a freshly imported batch of tickets.
 * Sequential on purpose (not Promise.all) - the free-tier Gemini key hits
 * rate limits under concurrent load (observed directly during this
 * project), and sequential calls are easier to reason about for cost.
 * See DECISIONS.md for the tradeoff (slower for large imports).
 */

import { triageTicket } from './triageApi.js'

/**
 * Runs triage for each ticket one at a time, dispatching the reducer
 * actions that drive each ticket's `triage.status` as it goes.
 * @param {!Array<{id: string, customer: string, subject: string,
 *     message: string}>} tickets
 * @param {string} apiKey
 * @param {function(Object): void} dispatch
 * @return {Promise<void>}
 */
export async function runTriageForTickets(tickets, apiKey, dispatch) {
  for (const ticket of tickets) {
    dispatch({ type: 'TRIAGE_STARTED', ticketId: ticket.id })
    const result = await triageTicket(ticket, apiKey)
    if (result.success) {
      dispatch({
        type: 'TRIAGE_SUCCEEDED',
        ticketId: ticket.id,
        priority: result.priority,
        category: result.category,
        reason: result.reason,
      })
    } else {
      dispatch({ type: 'TRIAGE_FAILED', ticketId: ticket.id, error: result.error, retryable: result.retryable })
    }
  }
}
