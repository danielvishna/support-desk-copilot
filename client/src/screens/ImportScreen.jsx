/**
 * @fileoverview CSV upload screen. Parses + validates the file, replaces
 * the ticket set in state, and immediately kicks off triage for every row
 * (user's explicit choice - see DECISIONS.md).
 */

import { useState } from 'react'
import { ApiKeyField } from '../components/ApiKeyField.jsx'
import { MAX_FILE_SIZE_BYTES, MAX_ROWS, parseTicketsCsv } from '../lib/parseTicketsCsv.js'
import { runTriageForTickets } from '../lib/runTriage.js'
import { useApiKey } from '../state/ApiKeyContext.jsx'
import { useTicketsDispatch } from '../state/TicketsContext.jsx'

/**
 * @param {{onImported: function(): void}} props Called right after a
 *     successful import, so the parent can switch off a forced import view.
 * @return {React.ReactElement}
 */
export function ImportScreen({ onImported }) {
  const dispatch = useTicketsDispatch()
  const { apiKey } = useApiKey()
  const [status, setStatus] = useState('idle') // idle | parsing | error
  const [errors, setErrors] = useState([])

  /**
   * @param {!Event} event
   * @return {Promise<void>}
   */
  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file name
    if (!file) return

    setStatus('parsing')
    setErrors([])

    const { rows, errors: parseErrors } = await parseTicketsCsv(file)

    if (rows.length === 0) {
      setStatus('error')
      setErrors(parseErrors.length > 0 ? parseErrors : ['No valid ticket rows found in this file.'])
      return
    }

    setStatus('idle')
    setErrors(parseErrors)
    dispatch({ type: 'TICKETS_IMPORTED', rows, fileName: file.name, errors: parseErrors })
    onImported?.()

    if (apiKey.trim()) {
      runTriageForTickets(rows, apiKey.trim(), dispatch)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold">Support Desk Copilot</h1>
        <p className="text-sm text-gray-500">Upload a CSV of customer tickets to triage them with AI.</p>
      </div>

      <ApiKeyField />
      {!apiKey.trim() && (
        <p className="text-xs text-amber-600">
          No key entered yet - tickets will import, but triage won't run until you add one.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="csvFile"
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 hover:border-gray-400"
        >
          <span className="font-medium text-gray-700">
            {status === 'parsing' ? 'Reading file...' : 'Choose a CSV file'}
          </span>
          <span className="text-xs text-gray-400">
            Columns: id, customer, subject, message - up to {MAX_ROWS} rows, {MAX_FILE_SIZE_BYTES / 1024 / 1024}MB
          </span>
        </label>
        <input
          id="csvFile"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={status === 'parsing'}
          className="sr-only"
        />
      </div>

      {errors.length > 0 && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          <p className="font-medium">{status === 'error' ? 'Could not import this file:' : 'Imported with some rows skipped:'}</p>
          <ul className="mt-1 list-disc pl-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Example: <code>id,customer,subject,message</code> - see README for a sample file.
      </p>
    </main>
  )
}
