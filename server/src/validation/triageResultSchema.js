import { z } from 'zod'

export const triageResultSchema = z.object({
  priority: z.enum(['High', 'Medium', 'Low']),
  category: z.enum(['Billing', 'Technical', 'Feature Request', 'Other']),
  reason: z.string().min(1).max(500),
})

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
