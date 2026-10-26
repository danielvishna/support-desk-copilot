/**
 * @fileoverview Parses and validates a tickets CSV client-side, before any
 * of it reaches app state or the AI. Kept separate from the import UI and
 * from the reducer per CLAUDE.md's "input validation is its own module"
 * rule. Limits here mirror server/src/validation/ticketSchema.js so a row
 * that would be rejected by the API never even enters client state.
 */

import Papa from 'papaparse'

/** Required columns, in no particular order. @const {!Array<string>} */
const REQUIRED_COLUMNS = ['id', 'customer', 'subject', 'message']

/** Keeps a single ticket from blowing up model cost/latency. @const {number} */
export const MAX_SUBJECT_LENGTH = 300

/** @const {number} */
export const MAX_MESSAGE_LENGTH = 4000

/** Caps total AI triage calls fired per import. @const {number} */
export const MAX_ROWS = 200

/** @const {number} */
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024

/**
 * @typedef {Object} ParseResult
 * @property {!Array<{id: string, customer: string, subject: string,
 *     message: string}>} rows Valid rows only, in file order.
 * @property {!Array<string>} errors Human-readable problems: missing
 *     columns, oversized file, rows dropped for being invalid, etc.
 */

/**
 * @param {!File} file
 * @return {Promise<ParseResult>}
 */
export function parseTicketsCsv(file) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Promise.resolve({
      rows: [],
      errors: [`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is 2MB.`],
    })
  }

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(validate(results)),
      error: (err) => resolve({ rows: [], errors: [`Could not read the file: ${err.message}`] }),
    })
  })
}

/**
 * @param {!Papa.ParseResult<Object>} results
 * @return {ParseResult}
 */
function validate(results) {
  const errors = []
  const fields = results.meta.fields ?? []
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !fields.includes(c))
  if (missingColumns.length > 0) {
    return { rows: [], errors: [`Missing required column(s): ${missingColumns.join(', ')}.`] }
  }

  for (const err of results.errors) {
    errors.push(`Row ${err.row + 2}: ${err.message}`)
  }

  const seenIds = new Set()
  const rows = []
  const sourceRows = results.data.slice(0, MAX_ROWS)
  if (results.data.length > MAX_ROWS) {
    errors.push(`File has ${results.data.length} rows; only the first ${MAX_ROWS} were imported.`)
  }

  sourceRows.forEach((raw, index) => {
    const rowNumber = index + 2 // +1 for header, +1 for 1-based rows
    const id = (raw.id ?? '').trim()
    const customer = (raw.customer ?? '').trim()
    const subject = (raw.subject ?? '').trim()
    const message = (raw.message ?? '').trim()

    if (!id || !customer || !subject || !message) {
      errors.push(`Row ${rowNumber}: missing a required field (id, customer, subject, or message).`)
      return
    }
    if (seenIds.has(id)) {
      errors.push(`Row ${rowNumber}: duplicate ticket id "${id}", skipped.`)
      return
    }
    if (subject.length > MAX_SUBJECT_LENGTH) {
      errors.push(`Row ${rowNumber}: subject exceeds ${MAX_SUBJECT_LENGTH} characters, skipped.`)
      return
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      errors.push(`Row ${rowNumber}: message exceeds ${MAX_MESSAGE_LENGTH} characters, skipped.`)
      return
    }

    seenIds.add(id)
    rows.push({ id, customer, subject, message })
  })

  return { rows, errors }
}
