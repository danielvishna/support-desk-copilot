/**
 * @fileoverview Validates an incoming ticket before it reaches AI logic.
 * Kept separate from routes and AI code per CLAUDE.md's architecture rule -
 * input validation is its own concern.
 */

import { z } from 'zod'

/**
 * Keeps a single ticket from blowing up model cost/latency.
 * @const {number}
 */
export const MAX_MESSAGE_LENGTH = 4000

/** @const {number} */
export const MAX_SUBJECT_LENGTH = 300

/** @const {!z.ZodObject} */
export const ticketSchema = z.object({
  id: z.string().min(1),
  customer: z.string().min(1).max(200),
  subject: z.string().min(1).max(MAX_SUBJECT_LENGTH),
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
})

/**
 * @param {*} body Unvalidated request body.
 * @return {{success: true, data: {id: string, customer: string,
 *     subject: string, message: string}}|{success: false, error: string}}
 */
export function parseTicket(body) {
  const result = ticketSchema.safeParse(body)
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => i.message).join('; ') }
  }
  return { success: true, data: result.data }
}
