import { z } from 'zod'

// Reasonable limits to keep a single ticket from blowing up model cost/latency.
export const MAX_MESSAGE_LENGTH = 4000
export const MAX_SUBJECT_LENGTH = 300

export const ticketSchema = z.object({
  id: z.string().min(1),
  customer: z.string().min(1).max(200),
  subject: z.string().min(1).max(MAX_SUBJECT_LENGTH),
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
})

export function parseTicket(body) {
  const result = ticketSchema.safeParse(body)
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => i.message).join('; ') }
  }
  return { success: true, data: result.data }
}
