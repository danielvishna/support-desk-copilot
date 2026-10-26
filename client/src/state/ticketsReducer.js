/**
 * @fileoverview The app's single source of truth for ticket data: imported
 * tickets, their AI triage results, drafted replies, and review status.
 * Per CLAUDE.md's architecture rule, this state is explicit and structured -
 * never reconstructed from chat/AI output text. Pure reducer, no React or
 * fetch here, so it's trivial to unit-test in isolation.
 */

/**
 * @typedef {Object} Ticket
 * @property {string} id
 * @property {string} customer
 * @property {string} subject
 * @property {string} message
 * @property {{status: 'pending'|'loading'|'done'|'error', priority:
 *     (string|null), category: (string|null), reason: (string|null),
 *     error: (string|null), retryable: boolean}} triage
 * @property {{text: string, streaming: boolean, reviewed: boolean,
 *     error: (string|null)}} draft
 */

/**
 * @typedef {Object} AppState
 * @property {!Object<string, Ticket>} tickets Keyed by ticket id.
 * @property {!Array<string>} ticketOrder Ids in CSV import order.
 * @property {{fileName: (string|null), rowCount: number,
 *     errors: !Array<string>}} importMeta
 */

/** @const {AppState} */
export const initialState = {
  tickets: {},
  ticketOrder: [],
  importMeta: { fileName: null, rowCount: 0, errors: [] },
}

/**
 * @param {!Array<{id: string, customer: string, subject: string,
 *     message: string}>} rows Validated rows from the CSV parser.
 * @return {Ticket}
 */
function toTicket(row) {
  return {
    ...row,
    triage: { status: 'pending', priority: null, category: null, reason: null, error: null, retryable: false },
    draft: { text: '', streaming: false, reviewed: false, error: null },
  }
}

/**
 * @param {AppState} state
 * @param {Object} action
 * @return {AppState}
 */
export function ticketsReducer(state, action) {
  switch (action.type) {
    // A new CSV import replaces all previous tickets entirely (user's
    // explicit choice - no merging across imports).
    case 'TICKETS_IMPORTED': {
      const tickets = {}
      const ticketOrder = []
      for (const row of action.rows) {
        tickets[row.id] = toTicket(row)
        ticketOrder.push(row.id)
      }
      return {
        tickets,
        ticketOrder,
        importMeta: {
          fileName: action.fileName,
          rowCount: ticketOrder.length,
          errors: action.errors ?? [],
        },
      }
    }

    case 'TRIAGE_STARTED':
      return withTicket(state, action.ticketId, (t) => ({
        ...t,
        triage: { ...t.triage, status: 'loading', error: null },
      }))

    case 'TRIAGE_SUCCEEDED':
      return withTicket(state, action.ticketId, (t) => ({
        ...t,
        triage: {
          status: 'done',
          priority: action.priority,
          category: action.category,
          reason: action.reason,
          error: null,
          retryable: false,
        },
      }))

    case 'TRIAGE_FAILED':
      return withTicket(state, action.ticketId, (t) => ({
        ...t,
        triage: {
          ...t.triage,
          status: 'error',
          error: action.error,
          retryable: Boolean(action.retryable),
        },
      }))

    case 'DRAFT_UPDATED':
      return withTicket(state, action.ticketId, (t) => ({
        ...t,
        draft: { ...t.draft, text: action.text },
      }))

    // Appends a streamed chunk via the reducer (not the caller reading
    // ticket.draft.text itself) so concurrent dispatches can't race on a
    // stale closure value.
    case 'DRAFT_APPENDED':
      return withTicket(state, action.ticketId, (t) => ({
        ...t,
        draft: { ...t.draft, text: t.draft.text + action.chunk },
      }))

    case 'DRAFT_STREAMING_SET':
      return withTicket(state, action.ticketId, (t) => ({
        ...t,
        draft: { ...t.draft, streaming: action.streaming, error: action.streaming ? null : t.draft.error },
      }))

    case 'DRAFT_ERROR_SET':
      return withTicket(state, action.ticketId, (t) => ({
        ...t,
        draft: { ...t.draft, error: action.error },
      }))

    case 'REVIEW_SET':
      return withTicket(state, action.ticketId, (t) => ({
        ...t,
        draft: { ...t.draft, reviewed: action.reviewed },
      }))

    default:
      return state
  }
}

/**
 * Applies `update` to one ticket by id, leaving the rest of state untouched.
 * No-ops if the ticket id no longer exists (e.g. a stale async response
 * arriving after a fresh CSV import replaced the ticket set).
 * @param {AppState} state
 * @param {string} ticketId
 * @param {function(Ticket): Ticket} update
 * @return {AppState}
 */
function withTicket(state, ticketId, update) {
  const ticket = state.tickets[ticketId]
  if (!ticket) return state
  return {
    ...state,
    tickets: { ...state.tickets, [ticketId]: update(ticket) },
  }
}

/**
 * Derives the "N of M reviewed" progress the brief asks for, instead of
 * storing it as separate state that could drift out of sync.
 * @param {AppState} state
 * @return {{reviewed: number, total: number}}
 */
export function selectReviewProgress(state) {
  const total = state.ticketOrder.length
  const reviewed = state.ticketOrder.filter((id) => state.tickets[id]?.draft.reviewed).length
  return { reviewed, total }
}
