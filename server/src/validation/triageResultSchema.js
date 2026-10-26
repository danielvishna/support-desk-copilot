/**
 * @fileoverview Validates Gemini's triage JSON before it's trusted anywhere
 * else in the app. Gemini's responseSchema (see ai/triagePrompt.js)
 * constrains generation, but CLAUDE.md requires we still check the result
 * ourselves rather than trust a provider blindly.
 */

import { z } from 'zod'

/** @const {!z.ZodObject} */
export const triageResultSchema = z.object({
  priority: z.enum(['High', 'Medium', 'Low']),
  category: z.enum(['Billing', 'Technical', 'Feature Request', 'Other']),
  reason: z.string().min(1).max(500),
  quote: z.string().max(500),
})

/**
 * @param {string} rawText The raw text Gemini returned (expected to be
 *     JSON, but never assumed to be).
 * @return {{success: true, data: {priority: string, category: string,
 *     reason: string, quote: string}}|{success: false, error: string}}
 */
export function parseTriageResult(rawText) {
  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { success: false, error: 'Model did not return valid JSON' }
  }

  const result = triageResultSchema.safeParse(parsed)
  if (!result.success) {
    return { success: false, error: result.error.message }
  }

  return { success: true, data: result.data }
}

/**
 * The model is asked to copy `quote` verbatim from the ticket message, but
 * it's still a model output - never trust it without checking. Used to
 * decide whether the UI can safely highlight it in the original message.
 * @param {string} quote
 * @param {string} message
 * @return {boolean}
 */
export function isQuoteGrounded(quote, message) {
  return quote.trim().length > 0 && message.includes(quote)
}
