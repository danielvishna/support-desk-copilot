/**
 * @fileoverview Renders a ticket message with the AI's supporting quote
 * highlighted inline - visible proof the triage reason is grounded in the
 * actual text, not invented. `quote` is only ever a string the server
 * already verified is a real substring of `message` (see
 * server/src/validation/triageResultSchema.js's isQuoteGrounded), but this
 * component re-checks before rendering a highlight so a UI bug elsewhere
 * can't make it claim a quote exists when it doesn't.
 */

/**
 * @param {{message: string, quote: string}} props
 * @return {React.ReactElement}
 */
export function HighlightedMessage({ message, quote }) {
  const index = quote ? message.indexOf(quote) : -1
  if (index === -1) {
    return (
      <p dir="auto" className="text-sm whitespace-pre-wrap text-gray-800">
        {message}
      </p>
    )
  }

  const before = message.slice(0, index)
  const after = message.slice(index + quote.length)

  return (
    <p dir="auto" className="text-sm whitespace-pre-wrap text-gray-800">
      {before}
      <mark className="rounded bg-amber-200 px-0.5 text-gray-900">{quote}</mark>
      {after}
    </p>
  )
}
