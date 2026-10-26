/**
 * @fileoverview Ticket detail: original message alongside the AI triage
 * analysis, plus an editable reply draft and the reviewed toggle. Reply
 * generation (streaming + Stop) isn't built yet - the draft is manually
 * editable for now; see DECISIONS.md.
 */

import { PriorityBadge, CategoryBadge } from '../components/Badges.jsx'
import { triageTicket } from '../lib/triageApi.js'
import { useApiKey } from '../state/ApiKeyContext.jsx'
import { useTicketsDispatch, useTicketsState } from '../state/TicketsContext.jsx'

/**
 * @param {{ticketId: string, onBack: function(): void}} props
 * @return {React.ReactElement}
 */
export function TicketDetailScreen({ ticketId, onBack }) {
  const state = useTicketsState()
  const dispatch = useTicketsDispatch()
  const { apiKey } = useApiKey()
  const ticket = state.tickets[ticketId]

  if (!ticket) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 py-6">
        <p className="text-sm text-gray-500">This ticket is no longer available.</p>
        <button type="button" onClick={onBack} className="text-sm font-medium text-gray-700 underline">
          Back to list
        </button>
      </main>
    )
  }

  /** @return {Promise<void>} */
  async function runTriage() {
    if (!apiKey.trim()) return
    dispatch({ type: 'TRIAGE_STARTED', ticketId })
    const result = await triageTicket(ticket, apiKey.trim())
    if (result.success) {
      dispatch({ type: 'TRIAGE_SUCCEEDED', ticketId, priority: result.priority, category: result.category, reason: result.reason })
    } else {
      dispatch({ type: 'TRIAGE_FAILED', ticketId, error: result.error, retryable: result.retryable })
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 py-6">
      <button type="button" onClick={onBack} className="w-fit text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Back to list
      </button>

      <div>
        <h1 className="text-lg font-semibold">{ticket.subject}</h1>
        <p className="text-xs text-gray-500">{ticket.customer} · {ticket.id}</p>
      </div>

      <section className="rounded border border-gray-200 bg-gray-50 px-3 py-3">
        <p className="mb-1 text-xs font-medium text-gray-500">Original message</p>
        <p className="text-sm whitespace-pre-wrap text-gray-800">{ticket.message}</p>
      </section>

      <section className="rounded border border-gray-200 px-3 py-3">
        <p className="mb-2 text-xs font-medium text-gray-500">AI analysis</p>

        {ticket.triage.status === 'loading' && <p className="text-sm text-gray-400">Triaging...</p>}

        {ticket.triage.status === 'done' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={ticket.triage.priority} />
              <CategoryBadge category={ticket.triage.category} />
            </div>
            <p className="text-sm text-gray-700">{ticket.triage.reason}</p>
          </div>
        )}

        {ticket.triage.status === 'error' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-600">{ticket.triage.error}</p>
            <button
              type="button"
              onClick={runTriage}
              disabled={!apiKey.trim()}
              className="w-fit rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Retry triage
            </button>
          </div>
        )}

        {ticket.triage.status === 'pending' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-400">Not triaged yet.</p>
            <button
              type="button"
              onClick={runTriage}
              disabled={!apiKey.trim()}
              className="w-fit rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Run triage
            </button>
            {!apiKey.trim() && <p className="text-xs text-amber-600">Enter an API key to triage this ticket.</p>}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="draft" className="text-xs font-medium text-gray-500">
          Reply draft
        </label>
        <textarea
          id="draft"
          rows={6}
          value={ticket.draft.text}
          onChange={(e) => dispatch({ type: 'DRAFT_UPDATED', ticketId, text: e.target.value })}
          placeholder="Write or generate a reply..."
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400">AI-assisted reply generation is coming next - draft is manual for now.</p>
      </section>

      <label className="flex w-fit items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={ticket.draft.reviewed}
          onChange={(e) => dispatch({ type: 'REVIEW_SET', ticketId, reviewed: e.target.checked })}
        />
        Mark as reviewed
      </label>
    </main>
  )
}
