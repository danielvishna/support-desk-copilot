/**
 * @fileoverview Responsive ticket list: priority, category, and review
 * status per ticket, plus the "N of M reviewed" progress the brief asks
 * for. Pure read of TicketsContext - no fetching here (CLAUDE.md).
 */

import { CategoryBadge, PriorityBadge, ReviewedBadge, TriageStatusBadge } from '../components/Badges.jsx'
import { selectReviewProgress } from '../state/ticketsReducer.js'
import { useTicketsState } from '../state/TicketsContext.jsx'

/**
 * @param {{onSelectTicket: function(string): void, onImportNew:
 *     function(): void}} props
 * @return {React.ReactElement}
 */
export function TicketListScreen({ onSelectTicket, onImportNew }) {
  const state = useTicketsState()
  const { reviewed, total } = selectReviewProgress(state)
  const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Tickets</h1>
          <p className="text-xs text-gray-500">
            {reviewed} of {total} reviewed {state.importMeta.fileName ? `· ${state.importMeta.fileName}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onImportNew}
          className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Import new CSV
        </button>
      </div>

      <div
        role="progressbar"
        aria-valuenow={reviewed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${reviewed} of ${total} tickets reviewed`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
      >
        <div className="h-full bg-gray-900 transition-[width]" style={{ width: `${progressPct}%` }} />
      </div>

      {state.importMeta.errors.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {state.importMeta.errors.length} row(s) were skipped during import.
        </div>
      )}

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">No tickets imported yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.ticketOrder.map((id) => {
            const ticket = state.tickets[id]
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelectTicket(id)}
                  className="flex w-full flex-col gap-1.5 rounded border border-gray-200 px-3 py-2.5 text-left hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span dir="auto" className="truncate text-sm font-medium text-gray-900">
                      {ticket.subject}
                    </span>
                  </div>
                  <p dir="auto" className="truncate text-xs text-gray-500">
                    {ticket.customer}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={ticket.triage.priority} />
                    <CategoryBadge category={ticket.triage.category} />
                    <TriageStatusBadge status={ticket.triage.status} />
                    {ticket.draft.reviewed && <ReviewedBadge />}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
