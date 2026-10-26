/**
 * @fileoverview Small presentational badges for priority/category/review
 * status. Pure UI, no state or fetch - per CLAUDE.md's UI-layer rule.
 */

/** @const {!Object<string, string>} */
const PRIORITY_STYLES = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

/**
 * @param {{priority: (string|null)}} props
 * @return {React.ReactElement}
 */
export function PriorityBadge({ priority }) {
  if (!priority) return null
  const style = PRIORITY_STYLES[priority] ?? 'bg-gray-100 text-gray-700'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style}`}>{priority}</span>
}

/**
 * @param {{category: (string|null)}} props
 * @return {React.ReactElement}
 */
export function CategoryBadge({ category }) {
  if (!category) return null
  return (
    <span className="rounded-full border border-gray-300 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-gray-600">
      {category}
    </span>
  )
}

/**
 * @param {{status: string}} props One of Ticket.triage.status.
 * @return {React.ReactElement}
 */
export function TriageStatusBadge({ status }) {
  if (status === 'loading') {
    return <span className="text-xs font-medium whitespace-nowrap text-gray-500">Triaging...</span>
  }
  if (status === 'error') {
    return <span className="text-xs font-medium whitespace-nowrap text-red-600">Triage failed</span>
  }
  if (status === 'pending') {
    return <span className="text-xs font-medium whitespace-nowrap text-gray-500">Pending</span>
  }
  return null
}

/**
 * @return {React.ReactElement}
 */
export function ReviewedBadge() {
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-green-700">
      Reviewed
    </span>
  )
}
